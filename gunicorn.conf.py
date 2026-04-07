# Gunicorn configuration for all_sanctions
# ─────────────────────────────────────────
# sync workers are single-threaded; a cold-cache dataset fetch from
# opensanctions.org can take 30-120s, so the timeout must accommodate that.

import multiprocessing

# One worker per CPU core, minimum 2
workers = max(2, multiprocessing.cpu_count())

# Worker type — sync is fine; requests queue behind one another per worker
worker_class = "sync"

# Allow up to 3 minutes for a single request (cold-cache L3 fetch worst case)
timeout = 180

# Graceful shutdown window
graceful_timeout = 30

# Keep-alive for load balancer connections
keepalive = 5

# Bind
bind = "0.0.0.0:5001"

# Logging
accesslog = "-"
errorlog  = "-"
loglevel  = "info"

# Preload app in master before forking workers.
# Workers share the master's read-only memory pages (CoW), so datasets already
# in _entity_cache before forking are visible in all workers at zero extra cost.
# Warmup network fetches happen once in the master, not N times per worker.
preload_app = True


def post_fork(server, worker):
    """
    Reset the SQLite connection after each worker forks from the master.
    The master's file descriptor must not be reused by child processes —
    each worker gets its own fresh connection via threading.local().
    """
    import cache as l2
    if getattr(l2._local, "conn", None):
        try:
            l2._local.conn.close()
        except Exception:
            pass
        l2._local.conn = None
