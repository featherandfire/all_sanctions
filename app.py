#!/usr/bin/env python3
"""
OpenSanctions Web UI — application factory.
"""

import sys
import os

# Allow imports from project root when running from any directory
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, render_template
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
