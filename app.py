#!/usr/bin/env python3
"""
OpenSanctions Web UI — application factory.
"""

import sys
import os

# Allow imports from project root when running from any directory
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template
from routes.datasets import datasets_bp
from routes.cyber import cyber_bp
from routes.entity_search import entity_search_bp
from routes.resources import resources_bp

app = Flask(__name__, template_folder="templates", static_folder="static")

app.register_blueprint(datasets_bp)
app.register_blueprint(cyber_bp)
app.register_blueprint(entity_search_bp)
app.register_blueprint(resources_bp)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    print("OpenSanctions Explorer → http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
