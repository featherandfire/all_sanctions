"""
Blueprint: census_bp
Routes: /api/stats/population-by-state
"""

import json
import ssl
import urllib.request

from flask import Blueprint, jsonify
from config import CENSUS_API_KEY

census_bp = Blueprint("census_bp", __name__)

# ACS 1-year 2022 — total population by state
_CENSUS_URL = (
    "https://api.census.gov/data/2022/acs/acs1"
    "?get=NAME,B01001_001E&for=state:*&key={key}"
)

_pop_cache = {}  # simple in-memory cache (cleared by /api/refresh if needed)


@census_bp.route("/api/stats/population-by-state")
def api_population_by_state():
    if "data" in _pop_cache:
        return jsonify(_pop_cache["data"])

    url = _CENSUS_URL.format(key=CENSUS_API_KEY)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(url, timeout=30, context=ctx) as resp:
            raw = json.load(resp)
    except Exception:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(url, timeout=30, context=ctx) as resp:
            raw = json.load(resp)

    # raw[0] = ["NAME", "B01001_001E", "state"]
    # raw[1:] = data rows
    result = []
    for row in raw[1:]:
        name = row[0]
        pop  = int(row[1]) if row[1] and row[1] != "-666666666" else 0
        if pop > 0:
            result.append({"label": name, "value": pop})

    result.sort(key=lambda x: -x["value"])
    _pop_cache["data"] = result
    return jsonify(result)
