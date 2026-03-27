"""
Blueprint: datasets_bp
Routes: /api/datasets, /api/search, /api/dataset/<name>, /api/stats, /api/tags, /api/refresh
"""

from flask import Blueprint, jsonify, request
from data import fetch_index, visible_datasets, serialize_dataset, _get_entities, _get_entities_batch, _cache, _entity_cache

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
