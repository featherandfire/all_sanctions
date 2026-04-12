# SearchMySanctions

A unified interface for screening individuals, entities, and crypto wallets against 40+ global sanctions, watchlist, and exclusion datasets.

## Tech Stack

| Layer | Technology |
|---|---|
| Data | [OpenSanctions](https://www.opensanctions.org/) — live dataset index + entity records |
| API | Flask 3 + Blueprints |
| Cache | L1 in-memory dict → L2 SQLite (aiosqlite) → L3 origin fetch |
| Frontend | Vanilla JS + D3.js v7 (charts) |
| Templates | Jinja2 |
| Data processing | pandas, pgeocode, numpy |
| Reverse proxy | Caddy (auto-TLS) |
| WSGI server | Gunicorn |
| Process manager | systemd |

## Views

| View | Description |
|---|---|
| **Browse Datasets** | Full OpenSanctions catalog — filter by tag, country, type |
| **Visual Statistics** | Charts: publisher countries, cyber records, SDN crypto wallets, US population |
| **Cyber & Crypto** | Wallet screening against OFAC SDN, FBI Lazarus, ransomware lists |
| **PEP** | Politically Exposed Persons — split by country, dataset cards |
| **Medicaid Exclusions** | HHS OIG excluded providers — by state, sector, city, year |
| **Entity Search** | Cross-list fuzzy name/ID search |
| **Search by Country** | All sanctioned entities by nationality or jurisdiction |
| **Tags** | Dataset catalog grouped by topic tag |
