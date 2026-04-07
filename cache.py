"""
L2 persistent cache — SQLite on disk, shared across all Gunicorn workers.

Architecture
------------
L1  in-memory dict      per-worker, ~0ms,   lost on restart   (existing _entity_cache)
L2  SQLite (this file)  shared, ~5ms,        survives restart  (new)
L3  origin              OpenSanctions CDN / Etherscan API      (fallback)

Usage
-----
    from cache import l2

    data = l2.get("entity", "us_ofac_sdn")
    if data is None:
        data = fetch_from_origin(...)
        l2.set("entity", "us_ofac_sdn", data)

TTLs are defined per source-type in TTL dict below.
Call l2.purge_expired() at startup to clear stale rows.
Call l2.stats() to inspect hit rates per source.
"""

import base64
import hashlib
import json
import logging
import os
import sqlite3
import threading
import time
import zlib

logger = logging.getLogger(__name__)

_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "l2_cache.db")
_local   = threading.local()   # per-thread connection

# ── TTLs (seconds) ────────────────────────────────────────────────────────────
TTL = {
    "entity":          86_400,   # 24 h  — OpenSanctions entity records
    "index":            3_600,   #  1 h  — OpenSanctions dataset index
    "sanctions_check":  3_600,   #  1 h  — per-address sanctions result
    "eth_balance":        120,   #  2 m  — wallet ETH balance
    "eth_price":          300,   #  5 m  — ETH/USD spot price
    "eth_txlist":         600,   # 10 m  — transaction list
    "eth_tokentx":        600,   # 10 m  — token transfers
    "census":         604_800,   #  7 d  — Census API responses
    "medicaid_stats":   3_600,   #  1 h  — pre-aggregated medicaid stat results
}

# ── Compression ───────────────────────────────────────────────────────────────
# Large payloads (entity records, etc.) are stored zlib-compressed to reduce
# disk I/O. A "z:" prefix marks compressed entries; plain JSON entries are read
# as-is for backward compatibility with any pre-existing uncompressed rows.

_ZLIB_MARKER  = "z:"
_COMPRESS_MIN = 4096   # bytes — only compress payloads larger than this


def _pack(data) -> str:
    raw = json.dumps(data, default=str).encode()
    if len(raw) >= _COMPRESS_MIN:
        return _ZLIB_MARKER + base64.b64encode(zlib.compress(raw, level=6)).decode()
    return raw.decode()


def _unpack(text: str):
    if text.startswith(_ZLIB_MARKER):
        return json.loads(zlib.decompress(base64.b64decode(text[len(_ZLIB_MARKER):])))
    return json.loads(text)
_DEFAULT_TTL = 3_600


# ── Connection ────────────────────────────────────────────────────────────────

def _conn() -> sqlite3.Connection:
    """Return a per-thread connection; create it lazily."""
    if not getattr(_local, "conn", None):
        # timeout=30: wait up to 30s for a write lock before raising
        conn = sqlite3.connect(_DB_PATH, check_same_thread=False, timeout=30)
        conn.execute("PRAGMA journal_mode=WAL")    # concurrent readers
        conn.execute("PRAGMA synchronous=NORMAL")  # fsync on checkpoint only
        conn.execute("PRAGMA cache_size=-32768")   # 32 MB page cache
        conn.execute("PRAGMA busy_timeout=30000")  # redundant but explicit (ms)
        conn.row_factory = sqlite3.Row
        _local.conn = conn
    return _local.conn


# ── Schema ────────────────────────────────────────────────────────────────────

def init():
    """Create tables if they don't exist. Call once at app startup."""
    conn = _conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS cache (
            key         TEXT    PRIMARY KEY,
            source      TEXT    NOT NULL,
            data        TEXT    NOT NULL,
            created_at  REAL    NOT NULL,
            ttl         INTEGER NOT NULL,
            hit_count   INTEGER NOT NULL DEFAULT 0,
            last_hit    REAL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_source  ON cache(source);
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(created_at, ttl);

        CREATE TABLE IF NOT EXISTS cache_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         REAL    NOT NULL,
            source     TEXT    NOT NULL,
            event      TEXT    NOT NULL   -- 'hit' | 'miss' | 'set' | 'expired'
        );
        CREATE INDEX IF NOT EXISTS idx_log_source ON cache_log(source);
        CREATE INDEX IF NOT EXISTS idx_log_ts     ON cache_log(ts);
    """)
    conn.commit()
    logger.info("L2 cache initialised at %s", _DB_PATH)


# ── Key ───────────────────────────────────────────────────────────────────────

def _make_key(source: str, identifier: str, params: dict = None) -> str:
    base = f"{source}:{identifier}"
    if params:
        h = hashlib.md5(
            json.dumps(params, sort_keys=True).encode()
        ).hexdigest()[:10]
        base += f":{h}"
    return base


# ── Public API ────────────────────────────────────────────────────────────────

def get(source: str, identifier: str, params: dict = None):
    """
    Return cached value or None if missing / expired.
    Automatically logs hit/miss/expired.
    """
    key  = _make_key(source, identifier, params)
    conn = _conn()
    now  = time.time()

    row = conn.execute(
        "SELECT data, created_at, ttl FROM cache WHERE key = ?", (key,)
    ).fetchone()

    if row is None:
        try:
            _log(conn, source, "miss")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        return None

    age = now - row["created_at"]
    if age >= row["ttl"]:
        try:
            conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            _log(conn, source, "expired")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        return None

    # Fresh hit
    try:
        conn.execute(
            "UPDATE cache SET hit_count = hit_count + 1, last_hit = ? WHERE key = ?",
            (now, key),
        )
        _log(conn, source, "hit")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    return _unpack(row["data"])


def set(source: str, identifier: str, data, params: dict = None, ttl: int = None):
    """
    Store value in L2. Overwrites any existing entry for the same key.
    Silently skips if the db is locked — L1 still has the data.
    """
    key  = _make_key(source, identifier, params)
    ttl  = ttl if ttl is not None else TTL.get(source, _DEFAULT_TTL)
    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO cache(key, source, data, created_at, ttl)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE
                SET data       = excluded.data,
                    created_at = excluded.created_at,
                    ttl        = excluded.ttl,
                    hit_count  = 0,
                    last_hit   = NULL
            """,
            (key, source, _pack(data), time.time(), ttl),
        )
        _log(conn, source, "set")
        conn.commit()
    except sqlite3.OperationalError as e:
        logger.warning("L2 set skipped (db locked): %s/%s — %s", source, identifier, e)


def invalidate(source: str = None, identifier: str = None):
    """
    Remove entries.
      invalidate()                     — clear entire cache
      invalidate(source="entity")      — clear all entity rows
      invalidate("entity","us_ofac_sdn") — clear one dataset
    """
    conn = _conn()
    if source and identifier:
        conn.execute(
            "DELETE FROM cache WHERE key LIKE ?",
            (f"{source}:{identifier}%",),
        )
    elif source:
        conn.execute("DELETE FROM cache WHERE source = ?", (source,))
    else:
        conn.execute("DELETE FROM cache")
    conn.commit()


def purge_expired() -> int:
    """Delete all stale rows. Returns count removed."""
    conn = _conn()
    now  = time.time()
    n    = conn.execute(
        "DELETE FROM cache WHERE (? - created_at) >= ttl", (now,)
    ).rowcount
    conn.commit()
    if n:
        logger.info("L2 cache: purged %d expired entries", n)
    return n


def stats() -> list[dict]:
    """
    Per-source stats: entry count, hit/miss counts, hit rate, avg age.
    Used by /api/cache-stats endpoint.
    """
    conn = _conn()
    now  = time.time()

    # Live entries per source
    live = conn.execute(
        """
        SELECT source,
               COUNT(*)                          AS entries,
               SUM(hit_count)                    AS total_hits,
               AVG(? - created_at)               AS avg_age_s,
               MIN(ttl - (? - created_at))       AS min_ttl_remaining_s,
               MAX(? - created_at)               AS max_age_s
        FROM   cache
        WHERE  (? - created_at) < ttl
        GROUP  BY source
        """,
        (now, now, now, now),
    ).fetchall()

    # Hit/miss log counts (last 24 h)
    log = conn.execute(
        """
        SELECT source, event, COUNT(*) AS n
        FROM   cache_log
        WHERE  ts > ?
        GROUP  BY source, event
        """,
        (now - 86_400,),
    ).fetchall()

    log_map: dict[str, dict] = {}
    for row in log:
        src = row["source"]
        if src not in log_map:
            log_map[src] = {"hit": 0, "miss": 0, "set": 0, "expired": 0}
        log_map[src][row["event"]] = row["n"]

    result = []
    for row in live:
        src       = row["source"]
        lm        = log_map.get(src, {})
        hits      = lm.get("hit",  0)
        misses    = lm.get("miss", 0)
        total     = hits + misses or 1
        ttl_label = TTL.get(src, _DEFAULT_TTL)
        result.append({
            "source":               src,
            "ttl_configured_s":     ttl_label,
            "entries":              row["entries"],
            "total_hits_alltime":   row["total_hits"] or 0,
            "hits_24h":             hits,
            "misses_24h":           misses,
            "hit_rate_24h_pct":     round(hits / total * 100, 1),
            "avg_age_min":          round((row["avg_age_s"]         or 0) / 60, 1),
            "max_age_min":          round((row["max_age_s"]         or 0) / 60, 1),
            "min_ttl_remaining_min":round((row["min_ttl_remaining_s"] or 0) / 60, 1),
        })

    # Add sources with log activity but no live entries (all expired/missed)
    for src, lm in log_map.items():
        if not any(r["source"] == src for r in result):
            hits   = lm.get("hit",  0)
            misses = lm.get("miss", 0)
            total  = hits + misses or 1
            result.append({
                "source": src, "entries": 0,
                "hits_24h": hits, "misses_24h": misses,
                "hit_rate_24h_pct": round(hits / total * 100, 1),
                "ttl_configured_s": TTL.get(src, _DEFAULT_TTL),
                "avg_age_min": 0, "max_age_min": 0,
                "min_ttl_remaining_min": 0, "total_hits_alltime": 0,
            })

    return sorted(result, key=lambda r: r["source"])


# ── Internal ──────────────────────────────────────────────────────────────────

def _log(conn: sqlite3.Connection, source: str, event: str):
    conn.execute(
        "INSERT INTO cache_log(ts, source, event) VALUES(?,?,?)",
        (time.time(), source, event),
    )
