"""
Blueprint: datasets_bp
Routes: /api/datasets, /api/search, /api/dataset/<name>, /api/stats, /api/tags, /api/refresh
"""

import re
from collections import Counter
from flask import Blueprint, jsonify, request
from data import fetch_index, visible_datasets, serialize_dataset, _get_entities, _get_entities_batch, _cache, _entity_cache

_geo = None
_city_zip_cache = {}

_US_STATES = {
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
    'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
    'TX','UT','VT','VA','WA','WV','WI','WY','DC',
}
_STREET_SUFFIXES = {
    'st','ave','blvd','dr','rd','ln','ct','pl','way','hwy','pkwy','cir','ter',
}

# Manual city patches for records whose stored address is truncated (no city/state in source data)
_ADDRESS_CITY_PATCH = {
    '621 e. cypress ave.': 'Glendora',
    '301 ferrari way':     'Lincoln',
    '250 east fern ave, #106, ca': 'Redlands',
    '771 willow lake way': 'Ceres',
    '2960 sycamore ln':    'Davis',
    '8101 arroyo vista dr.': 'Sacramento',
}

def _get_geo():
    global _geo
    if _geo is None:
        import pgeocode
        _geo = pgeocode.Nominatim('us')
    return _geo

def _city_from_address(address):
    """Parse the city name from an address string.
    Returns a title-cased city string or None if unparseable.

    Three strategies, tried in order:
    1. Comma-separated with trailing state: "123 Main St, Fresno, CA"
    2. Comma-separated without trailing state: "123 Main St, Fresno, 93701"
    3. No commas, state abbreviation inline: "123 Main St Fresno CA" / "Fresno CA 93701"
    """
    if not address:
        return None

    patched = _ADDRESS_CITY_PATCH.get(address.strip().lower())
    if patched:
        return patched

    def _valid(city):
        return bool(city and re.search(r'[A-Za-z]', city) and not re.match(r'^\d+$', city.strip()))

    # Branch 1: trailing state abbreviation (comma-separated)
    state_end = re.search(r',?\s*([A-Z]{2})\s*(?:\d{5}(?:-\d{4})?)?\s*$', address.strip())
    if state_end and state_end.group(1) in _US_STATES:
        before = address[:state_end.start()].strip().rstrip(',').strip()
        parts = [p.strip() for p in before.split(',') if p.strip()]
        city = parts[-1] if parts else None
        if _valid(city):
            return city.strip().title()

    # Branch 2: comma-separated — walk backwards, skip zips and state abbreviations
    if ',' in address:
        parts = [p.strip() for p in address.split(',') if p.strip()]
        city = None
        for part in reversed(parts):
            if re.match(r'^\d{5}(?:-\d{4})?$', part):
                continue
            if part.upper() in _US_STATES:
                continue
            city = part
            break
        if _valid(city):
            return city.strip().title()

    # Branch 3: no commas — find state abbreviation inline, take word(s) before it
    inline = re.search(r'\b([A-Z]{2})\b', address)
    if inline and inline.group(1) in _US_STATES:
        before = address[:inline.start()].strip()
        words = [w.strip('.,') for w in before.split() if w.strip('.,')]
        if not words:
            return None
        # If last word is a street suffix, try the two words before it as a multi-word city
        if words[-1].lower() in _STREET_SUFFIXES and len(words) >= 3:
            city = ' '.join(words[-3:-1])
        elif words[-1].lower() in _STREET_SUFFIXES:
            return None
        # If second-to-last word looks like a street suffix, city is just the last word
        elif len(words) >= 2 and words[-2].lower() in _STREET_SUFFIXES:
            city = words[-1]
        else:
            # Take up to 2 words in case it's a multi-word city (e.g. "Los Angeles")
            city = ' '.join(words[-2:]) if len(words) >= 2 else words[-1]
        if _valid(city):
            return city.strip().title()

    return None


def _zip_from_address(address):
    """Extract a zip code from an address string.
    Only returns a zip when one is explicitly present in the address."""
    if not address:
        return None
    m = re.search(r'\b(\d{5})(?:-\d{4})?\b', address)
    return m.group(1) if m else None

datasets_bp = Blueprint("datasets_bp", __name__)


@datasets_bp.route("/api/datasets")
def api_datasets():
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    return jsonify([serialize_dataset(d) for d in datasets])


@datasets_bp.route("/api/search")
def api_search():
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    q = request.args.get("q", "").lower().strip()
    field = request.args.get("field")  # country | tag | type | None

    if not q:
        return jsonify([serialize_dataset(d) for d in datasets])

    results = []
    for ds in datasets:
        if field == "country":
            pub_country = ds.get("publisher", {}).get("country", "").lower()
            pub_label = ds.get("publisher", {}).get("country_label", "").lower()
            if q in (pub_country, pub_label):
                results.append(ds)
        elif field == "tag":
            if any(q == t.lower() for t in ds.get("tags", [])):
                results.append(ds)
        elif field == "type":
            if q == ds.get("type", "").lower():
                results.append(ds)
        else:
            haystack = " ".join([
                ds.get("name", ""),
                ds.get("title", ""),
                ds.get("summary", ""),
                ds.get("description", "") or "",
                ds.get("publisher", {}).get("name", "") or "",
                ds.get("publisher", {}).get("country_label", "") or "",
                " ".join(ds.get("tags", [])),
            ]).lower()
            if q in haystack:
                results.append(ds)

    return jsonify([serialize_dataset(d) for d in results])


@datasets_bp.route("/api/dataset/<name>")
def api_dataset(name):
    index = fetch_index()
    match = next((d for d in index["datasets"] if d["name"] == name), None)
    if not match:
        return jsonify({"error": "Not found"}), 404
    return jsonify(serialize_dataset(match))


@datasets_bp.route("/api/stats")
def api_stats():
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    sources = [d for d in datasets if d.get("type") == "source"]
    collections = [d for d in datasets if d.get("type") == "collection"]
    errors = [d for d in datasets if d.get("result") not in ("success", None, "")]

    total_entities = sum(d.get("entity_count", 0) for d in datasets)
    total_targets = sum(d.get("target_count", 0) for d in datasets)

    top = sorted(datasets, key=lambda d: d.get("entity_count", 0), reverse=True)[:15]

    country_counts = {}
    for ds in sources:
        c = ds.get("publisher", {}).get("country")
        if c:
            country_counts[c] = country_counts.get(c, 0) + 1

    tag_counts = {}
    for ds in datasets:
        for t in ds.get("tags", []):
            tag_counts[t] = tag_counts.get(t, 0) + 1

    return jsonify({
        "total": len(datasets),
        "sources": len(sources),
        "collections": len(collections),
        "errors": len(errors),
        "total_entities": total_entities,
        "total_targets": total_targets,
        "countries": len(country_counts),
        "run_time": index.get("run_time"),
        "top_datasets": [
            {"name": d["name"], "title": d["title"], "entity_count": d.get("entity_count", 0)}
            for d in top
        ],
        "top_countries": sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:20],
        "top_tags": sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:30],
    })


@datasets_bp.route("/api/tags")
def api_tags():
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    tag_counts = {}
    for ds in datasets:
        for t in ds.get("tags", []):
            tag_counts[t] = tag_counts.get(t, 0) + 1
    return jsonify(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True))


@datasets_bp.route("/api/refresh")
def api_refresh():
    _cache.clear()
    _entity_cache.clear()
    fetch_index()
    return jsonify({"ok": True})


def _build_record_list(tag, ds_names_from_index):
    """Shared logic: load records for a filtered set of datasets using parallel fetching."""
    offset = int(request.args.get("offset", 0))
    limit  = int(request.args.get("limit", 500))

    batch = _get_entities_batch(ds_names_from_index)

    results = []
    searched = []
    for name in ds_names_from_index:
        rows = batch.get(name, [])
        if rows:
            searched.append(name)
        for row in rows:
            results.append(dict(row, _dataset=name))

    total = len(results)
    page  = results[offset : offset + limit]
    return jsonify({
        "results": page,
        "searched": searched,
        "total": total,
        "offset": offset,
        "limit": limit,
    })


@datasets_bp.route("/api/pep-records")
def api_pep_records():
    """Paginated entity records from datasets tagged list.pep."""
    index = fetch_index()
    ds_names = [
        d["name"] for d in index["datasets"]
        if "list.pep" in d.get("tags", [])
        and not d.get("hidden") and not d.get("deprecated")
        and any(r["name"] in ("targets.nested.json", "targets.simple.csv")
                for r in d.get("resources", []))
    ]
    return _build_record_list("list.pep", ds_names)


def _medicaid_entities(default="us_ca_med_exclusions"):
    """Return all entity rows for the requested dataset(s).
    Accepts ?datasets=name1,name2 (comma-separated) or legacy ?dataset=name."""
    raw = request.args.get("datasets") or request.args.get("dataset") or default
    names = [n.strip() for n in raw.split(",") if n.strip()]
    if len(names) == 1:
        return _get_entities(names[0])
    batch = _get_entities_batch(names)
    rows = []
    for name in names:
        rows.extend(batch.get(name, []))
    return rows


_SECTOR_ALIASES = {
    'rn':                      'Registered Nurse',
    'lvn':                     'Licensed Vocational Nurse',
    'licensed vocational nurse': 'Licensed Vocational Nurse',
    'md':                      'Medical Doctor',
    'medical doctor':          'Medical Doctor',
    'dds':                     'Dentist',
    'dentist':                 'Dentist',
    'pca':                     'Personal Care Assistant',
    'direct support worker (individual dsw)': 'Direct Support Worker',
    'dsw':                     'Direct Support Worker',

}

def _normalize_sector(s):
    return _SECTOR_ALIASES.get(s.strip().lower(), s.strip())


def _medicaid_counts(keys_fn):
    """Aggregate medicaid entities via a per-row key extractor and return a sorted label/value list."""
    counts = Counter()
    for row in _medicaid_entities():
        for key in keys_fn(row):
            if key:
                counts[key] += 1
    return jsonify(sorted(
        [{"label": k, "value": v} for k, v in counts.items()],
        key=lambda x: -x["value"]
    ))


@datasets_bp.route("/api/stats/medicaid-date-coverage")
def api_medicaid_date_coverage():
    """Check how many records have each date field populated, broken down by dataset."""
    index = fetch_index()
    ds_names = [
        d["name"] for d in index["datasets"]
        if "sector.usmed.debarment" in d.get("tags", [])
        and not d.get("hidden") and not d.get("deprecated")
    ]
    by_dataset = {}
    for name in ds_names:
        rows = _get_entities(name)
        by_dataset[name] = {
            "total": len(rows),
            "first_seen": sum(1 for r in rows if r.get("first_seen"))
        }
    states_with_first_seen = sum(1 for v in by_dataset.values() if v["first_seen"] > 0)
    return jsonify({
        "states_with_first_seen": states_with_first_seen,
        "total_datasets": len(ds_names),
        "by_dataset": by_dataset
    })


@datasets_bp.route("/api/stats/medicaid-by-year")
def api_medicaid_by_year():
    """Exclusion counts grouped by year of first_seen."""
    counts = Counter()
    for row in _medicaid_entities():
        val = row.get("first_seen") or ""
        year = val[:4]
        if year.isdigit() and 2000 <= int(year) <= 2100:
            counts[year] += 1
    return jsonify(sorted(
        [{"label": k, "value": v} for k, v in counts.items()],
        key=lambda x: x["label"]
    ))


@datasets_bp.route("/api/stats/medicaid-state-sectors")
def api_medicaid_state_sectors():
    """Per-state breakdown of top 5 sectors for stacked bar chart."""
    index = fetch_index()
    ds_names = [
        d["name"] for d in index["datasets"]
        if "sector.usmed.debarment" in d.get("tags", [])
        and not d.get("hidden") and not d.get("deprecated")
    ]

    def _state_abbr(name):
        m = re.match(r'^us_([a-z]{2})_', name)
        return m.group(1).upper() if m else 'FED'

    batch = _get_entities_batch(ds_names)
    state_sector = {}
    sector_totals = Counter()

    for name in ds_names:
        abbr = _state_abbr(name)
        if abbr not in state_sector:
            state_sector[abbr] = Counter()
        for row in batch.get(name, []):
            raw = row.get("sector") or row.get("position") or row.get("title") or ""
            for part in raw.split(","):
                s = _normalize_sector(part)
                if s:
                    state_sector[abbr][s] += 1
                    sector_totals[s] += 1

    top5 = [s for s, _ in sector_totals.most_common(5)]
    keys = top5 + ["Other"]

    states_data = []
    for abbr, counts in state_sector.items():
        total = sum(counts.values())
        if not total:
            continue
        entry = {"state": abbr, "total": total}
        for s in top5:
            entry[s] = counts.get(s, 0)
        entry["Other"] = total - sum(counts.get(s, 0) for s in top5)
        states_data.append(entry)

    states_data.sort(key=lambda x: -x["total"])
    return jsonify({"sectors": keys, "states": states_data[:25]})


@datasets_bp.route("/api/stats/medicaid-by-zipcode")
def api_medicaid_by_zipcode():
    """Zip code breakdown across one or more Medicaid datasets."""
    return _medicaid_counts(lambda r: [_zip_from_address(r.get("address"))])


@datasets_bp.route("/api/stats/medicaid-by-city")
def api_medicaid_by_city():
    """City breakdown across one or more Medicaid datasets."""
    return _medicaid_counts(lambda r: [_city_from_address(r.get("address"))])


@datasets_bp.route("/api/stats/medicaid-by-schema")
def api_medicaid_by_schema():
    """Person vs Organisation breakdown across one or more Medicaid datasets."""
    return _medicaid_counts(lambda r: [r.get("schema") or "Unknown"])


@datasets_bp.route("/api/stats/medicaid-by-sector")
def api_medicaid_by_sector():
    """Sector breakdown across one or more Medicaid datasets."""
    return _medicaid_counts(
        lambda r: [_normalize_sector(p) for p in (r.get("sector") or r.get("position") or r.get("title") or "").split(",")]
    )


@datasets_bp.route("/api/stats/medicaid-top-sector-cities")
def api_medicaid_top_sector_cities():
    """City breakdown for the top sector (or a named sector via ?sector=).
    Returns {sector, data:[{label, value}]}."""
    target_sector = request.args.get("sector")
    rows = _medicaid_entities()

    # Build sector→rows index
    sector_rows = {}
    for row in rows:
        raw = row.get("sector") or row.get("position") or row.get("title") or ""
        for part in raw.split(","):
            part = _normalize_sector(part)
            if part:
                if part not in sector_rows:
                    sector_rows[part] = []
                sector_rows[part].append(row)

    if not sector_rows:
        return jsonify({"sector": None, "data": []})

    # Use requested sector or fall back to the most common one
    if target_sector and target_sector in sector_rows:
        sector = target_sector
    else:
        sector = max(sector_rows, key=lambda s: len(sector_rows[s]))

    # Overall city totals across all sectors (used as denominator for per-city %)
    all_city_counts = {}
    for row in rows:
        c = _city_from_address(row.get("address"))
        if c:
            all_city_counts[c] = all_city_counts.get(c, 0) + 1

    city_counts = {}
    for row in sector_rows[sector]:
        c = _city_from_address(row.get("address"))
        if c:
            city_counts[c] = city_counts.get(c, 0) + 1

    data = sorted(
        [{"label": k, "value": v, "city_total": all_city_counts.get(k, v)}
         for k, v in city_counts.items()],
        key=lambda x: -x["value"]
    )
    return jsonify({"sector": sector, "data": data})


@datasets_bp.route("/api/medicaid-records")
def api_medicaid_records():
    """Paginated entity records from US Medicaid exclusion datasets."""
    index = fetch_index()
    ds_names = [
        d["name"] for d in index["datasets"]
        if "sector.usmed.debarment" in d.get("tags", [])
        and not d.get("hidden") and not d.get("deprecated")
        and any(r["name"] in ("targets.nested.json", "targets.simple.csv")
                for r in d.get("resources", []))
    ]
    return _build_record_list("sector.usmed.debarment", ds_names)


@datasets_bp.route("/api/nppes")
def api_nppes():
    """Proxy for NPPES NPI Registry API v2.1."""
    import requests as req
    params = dict(request.args)
    params['version'] = '2.1'
    try:
        resp = req.get(
            'https://npiregistry.cms.hhs.gov/api/',
            params=params,
            timeout=15,
        )
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e), "result_count": 0, "results": []}), 502
