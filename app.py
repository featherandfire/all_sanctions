#!/usr/bin/env python3
"""
OpenSanctions Web UI — application factory.
"""

import sys
import os
import threading
import logging

# Allow imports from project root when running from any directory
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, render_template

logger = logging.getLogger(__name__)
from routes.datasets import datasets_bp
from routes.cyber import cyber_bp
from routes.entity_search import entity_search_bp
from routes.resources import resources_bp
from routes.census import census_bp
import cache as l2

app = Flask(__name__, template_folder="templates", static_folder="static")

app.register_blueprint(datasets_bp)
app.register_blueprint(cyber_bp)
app.register_blueprint(entity_search_bp)
app.register_blueprint(resources_bp)
app.register_blueprint(census_bp)

# Initialise L2 cache and purge stale rows on startup
with app.app_context():
    l2.init()
    purged = l2.purge_expired()


def _background_warmup():
    """
    Pre-load expensive datasets into L1/L2 cache after startup so users never
    hit cold-cache latency.  Runs in a daemon thread — does not block startup.

    Priority order:
      1. Medicaid exclusion datasets (sector.usmed.debarment) — most expensive
      2. DEFAULT_SEARCH_DATASETS (sanctions screening)
    """
    import time
    from data import fetch_index, visible_datasets, _get_entities, DEFAULT_SEARCH_DATASETS

    time.sleep(3)  # let Gunicorn finish binding before hammering the network

    logger.info("Cache warmup: starting background pre-load")
    try:
        index = fetch_index()
        ds_list = visible_datasets(index["datasets"])

        # Collect datasets by priority
        warmup_tags = {"sector.usmed.debarment", "list.pep"}
        tagged = [
            d["name"] for d in ds_list
            if set(d.get("tags", [])) & warmup_tags
            and any(r["name"] in ("targets.nested.json", "targets.simple.csv")
                    for r in d.get("resources", []))
        ]

        targets = tagged + [n for n in DEFAULT_SEARCH_DATASETS if n not in tagged]

        for name in targets:
            try:
                _get_entities(name)
                logger.info("Cache warmup: loaded %s", name)
            except Exception as exc:
                logger.warning("Cache warmup: failed %s — %s", name, exc)

    except Exception as exc:
        logger.warning("Cache warmup: aborted — %s", exc)

    logger.info("Cache warmup: complete")


_warmup_thread = threading.Thread(target=_background_warmup, daemon=True)
_warmup_thread.start()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/cache-stats")
def api_cache_stats():
    """Return L2 cache stats per source — entries, hit rate, avg age."""
    return jsonify(l2.stats())


@app.route("/api/cache-invalidate", methods=["POST"])
def api_cache_invalidate():
    """
    Manually invalidate cache entries.
    Body: {"source": "entity", "identifier": "us_ofac_sdn"}  — one dataset
    Body: {"source": "entity"}                                — all entity rows
    Body: {}                                                  — entire cache
    """
    from flask import request
    body       = request.get_json(force=True) or {}
    source     = body.get("source")
    identifier = body.get("identifier")
    l2.invalidate(source=source, identifier=identifier)
    return jsonify({"ok": True, "source": source, "identifier": identifier})


if __name__ == "__main__":
    print("OpenSanctions Explorer → http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
