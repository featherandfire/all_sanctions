"""
Blueprint: resources_bp
Routes: /api/fetch-resource
"""

import json
import ssl
import urllib.request

from flask import Blueprint, jsonify, request
from data import fetch_index, visible_datasets, serialize_dataset, fmt_date, _flat_entity, _get_entities, DEFAULT_SEARCH_DATASETS, _cache, _entity_cache

resources_bp = Blueprint("resources_bp", __name__)


@resources_bp.route("/api/fetch-resource")
def api_fetch_resource():
    url = request.args.get("url", "")
    if not url or "opensanctions.org" not in url:
        return jsonify({"error": "Invalid URL"}), 400
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(url, timeout=60, context=ctx) as resp:
            raw = resp.read().decode("utf-8")
    except Exception:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(url, timeout=60, context=ctx) as resp:
            raw = resp.read().decode("utf-8")

    records = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except Exception:
            continue

    flat_records = [_flat_entity(r) for r in records[:5000]]

    # Derive column order: fixed priority columns first, then the rest
    priority = ["caption", "schema", "publicKey", "currency", "managingExchange",
                "accountId", "holder", "holder_alias", "topics",
                "sanction_authority", "sanction_id", "sanction_country",
                "sanction_start", "sanction_end",
                "first_seen", "last_seen", "last_change", "id"]
    all_keys = set()
    for r in flat_records:
        all_keys.update(r.keys())
    ordered = [k for k in priority if k in all_keys]
    ordered += sorted(k for k in all_keys if k not in priority)

    return jsonify({"records": flat_records, "columns": ordered, "total": len(records)})
