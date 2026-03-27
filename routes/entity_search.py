"""
Blueprint: entity_search_bp
Routes: /api/entity-search, /api/entity-search/datasets
"""

from flask import Blueprint, jsonify, request
from data import fetch_index, visible_datasets, serialize_dataset, fmt_date, _flat_entity, _get_entities, DEFAULT_SEARCH_DATASETS, _cache, _entity_cache

entity_search_bp = Blueprint("entity_search_bp", __name__)


@entity_search_bp.route("/api/entity-search")
def api_entity_search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({"results": [], "searched": [], "total": 0})

    datasets_param = request.args.get("datasets", "")
    ds_names = [d.strip() for d in datasets_param.split(",") if d.strip()] or DEFAULT_SEARCH_DATASETS

    lower = q.lower()
    results = []
    searched = []

    for name in ds_names:
        rows = _get_entities(name)
        if rows:
            searched.append(name)
        for row in rows:
            if any(lower in str(v).lower() for v in row.values() if v):
                results.append(dict(row, _dataset=name))

    return jsonify({"results": results[:500], "searched": searched, "total": len(results)})


@entity_search_bp.route("/api/entity-search/datasets")
def api_entity_search_datasets():
    """Return the list of datasets available for entity search with labels."""
    index = fetch_index()
    out = []
    for ds in index["datasets"]:
        if ds.get("hidden") or ds.get("deprecated"):
            continue
        has_data = any(r["name"] in ("targets.nested.json", "targets.simple.csv")
                       for r in ds.get("resources", []))
        if has_data:
            out.append({
                "name": ds["name"],
                "title": ds["title"],
                "entity_count": ds.get("entity_count", 0),
                "default": ds["name"] in DEFAULT_SEARCH_DATASETS,
            })
    out.sort(key=lambda d: -d["entity_count"])
    return jsonify(out)
