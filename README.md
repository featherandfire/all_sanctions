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
| WSGI server | Gunicorn (gthread, 1 worker / 4 threads) |
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

## Cache Architecture

```
Request
  └── L1 (in-memory dict)  — microsecond, process lifetime
        └── L2 (SQLite)    — millisecond, configurable TTL
              └── L3 (origin network fetch) — seconds, written back to L1+L2
```

On startup, a background thread promotes all valid L2 entity rows into L1 without making any network requests.

## Local Development

```bash
cd all_sanctions
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
# → http://localhost:5001
```

## Deployment

```bash
git pull origin main
sudo systemctl restart all_sanctions.service
```
