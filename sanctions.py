#!/usr/bin/env python3
"""
OpenSanctions Dataset Explorer
Query and view sanctions datasets from data.opensanctions.org
"""

import json
import ssl
import sys
import urllib.request
from datetime import datetime

INDEX_URL = "https://data.opensanctions.org/datasets/latest/index.json"

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"


def fetch_index():
    print(f"{DIM}Fetching index from OpenSanctions...{RESET}", end="\r")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(INDEX_URL, timeout=30, context=ctx) as resp:
            data = json.load(resp)
    except Exception:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(INDEX_URL, timeout=30, context=ctx) as resp:
            data = json.load(resp)
    print(" " * 50, end="\r")
    return data


def fmt_num(n):
    return f"{n:,}" if n else "0"


def fmt_date(s):
    if not s:
        return "N/A"
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return s[:10]


def print_dataset(ds, verbose=False):
    status_color = GREEN if ds.get("result") == "success" else RED
    print(f"\n{BOLD}{CYAN}{ds['title']}{RESET}  {DIM}({ds['name']}){RESET}")
    print(f"  {DIM}Type:{RESET}     {ds.get('type', 'N/A')}")
    print(f"  {DIM}Summary:{RESET}  {ds.get('summary', '')}")
    if ds.get("publisher"):
        pub = ds["publisher"]
        country = f" [{pub.get('country_label', '')}]" if pub.get("country_label") else ""
        print(f"  {DIM}Publisher:{RESET} {pub.get('name', 'N/A')}{country}")
    print(f"  {DIM}Entities:{RESET} {BOLD}{fmt_num(ds.get('entity_count', 0))}{RESET}  "
          f"{DIM}Targets:{RESET} {BOLD}{fmt_num(ds.get('target_count', 0))}{RESET}")
    print(f"  {DIM}Updated:{RESET}  {fmt_date(ds.get('updated_at'))}  "
          f"{DIM}Status:{RESET} {status_color}{ds.get('result', 'N/A')}{RESET}")
    if ds.get("tags"):
        tags = "  ".join(ds["tags"])
        print(f"  {DIM}Tags:{RESET}     {YELLOW}{tags}{RESET}")
    freq = ds.get("coverage", {}).get("frequency")
    if freq:
        print(f"  {DIM}Frequency:{RESET} {freq}")
    if verbose:
        if ds.get("description"):
            print(f"  {DIM}Description:{RESET} {ds['description'][:300]}")
        if ds.get("collections"):
            print(f"  {DIM}Collections:{RESET} {', '.join(ds['collections'])}")
        for res in ds.get("resources", []):
            size_kb = res.get("size", 0) // 1024
            print(f"  {DIM}Resource:{RESET}  {res['name']}  {DIM}({size_kb:,} KB){RESET}  {BLUE}{res['url']}{RESET}")


def list_datasets(datasets, limit=20):
    visible = [d for d in datasets if not d.get("hidden") and not d.get("deprecated")]
    print(f"\n{BOLD}Datasets{RESET} {DIM}({len(visible)} total){RESET}\n")
    print(f"  {'NAME':<35} {'TITLE':<40} {'ENTITIES':>10} {'UPDATED':<12}")
    print(f"  {'-'*35} {'-'*40} {'-'*10} {'-'*12}")
    for ds in visible[:limit]:
        name = ds["name"][:34]
        title = ds["title"][:39]
        entities = fmt_num(ds.get("entity_count", 0))
        updated = fmt_date(ds.get("updated_at"))
        print(f"  {CYAN}{name:<35}{RESET} {title:<40} {entities:>10}  {DIM}{updated}{RESET}")
    if len(visible) > limit:
        print(f"\n  {DIM}... {len(visible) - limit} more datasets. Use --limit N or search to filter.{RESET}")


def search_datasets(datasets, query, field=None):
    q = query.lower()
    results = []
    for ds in datasets:
        if ds.get("hidden") or ds.get("deprecated"):
            continue
        if field == "country":
            countries = ds.get("coverage", {}).get("countries", [])
            pub_country = ds.get("publisher", {}).get("country", "")
            if q in [c.lower() for c in countries] or q == pub_country.lower():
                results.append(ds)
        elif field == "tag":
            if any(q in t.lower() for t in ds.get("tags", [])):
                results.append(ds)
        elif field == "type":
            if q == ds.get("type", "").lower():
                results.append(ds)
        else:
            # Search name, title, summary, publisher name
            haystack = " ".join([
                ds.get("name", ""),
                ds.get("title", ""),
                ds.get("summary", ""),
                ds.get("description", ""),
                ds.get("publisher", {}).get("name", ""),
                ds.get("publisher", {}).get("country_label", ""),
                " ".join(ds.get("tags", [])),
            ]).lower()
            if q in haystack:
                results.append(ds)
    return results


def show_stats(datasets):
    visible = [d for d in datasets if not d.get("hidden") and not d.get("deprecated")]
    total_entities = sum(d.get("entity_count", 0) for d in visible)
    total_targets = sum(d.get("target_count", 0) for d in visible)
    sources = [d for d in visible if d.get("type") == "source"]
    collections = [d for d in visible if d.get("type") == "collection"]
    errors = [d for d in visible if d.get("result") != "success" and d.get("result")]

    # Top datasets by entity count
    top = sorted(visible, key=lambda d: d.get("entity_count", 0), reverse=True)[:10]

    # Countries from publisher
    all_countries = {}
    for ds in sources:
        country = ds.get("publisher", {}).get("country", "")
        if country:
            all_countries[country] = all_countries.get(country, 0) + 1

    print(f"\n{BOLD}OpenSanctions Index Stats{RESET}\n")
    print(f"  {DIM}Total datasets:{RESET}    {BOLD}{len(visible)}{RESET}")
    print(f"  {DIM}Sources:{RESET}           {len(sources)}")
    print(f"  {DIM}Collections:{RESET}       {len(collections)}")
    print(f"  {DIM}Total entities:{RESET}    {BOLD}{fmt_num(total_entities)}{RESET}")
    print(f"  {DIM}Total targets:{RESET}     {BOLD}{fmt_num(total_targets)}{RESET}")
    print(f"  {DIM}Countries covered:{RESET} {len(all_countries)}")
    if errors:
        print(f"  {DIM}Crawl errors:{RESET}      {RED}{len(errors)}{RESET}")

    print(f"\n{BOLD}Top 10 Datasets by Entity Count{RESET}")
    for i, ds in enumerate(top, 1):
        bar_len = int(ds.get("entity_count", 0) / max(top[0].get("entity_count", 1), 1) * 30)
        bar = "█" * bar_len
        print(f"  {i:2}. {CYAN}{ds['name']:<35}{RESET} {GREEN}{bar:<30}{RESET} {fmt_num(ds.get('entity_count', 0))}")

    print(f"\n{BOLD}Top Countries by Dataset Coverage{RESET}")
    top_countries = sorted(all_countries.items(), key=lambda x: x[1], reverse=True)[:15]
    for country, count in top_countries:
        print(f"  {country:<6} {count} datasets")


def show_help():
    print(f"""
{BOLD}OpenSanctions Explorer{RESET}

{BOLD}COMMANDS{RESET}

  {CYAN}list{RESET} [--limit N]
      List all datasets (default limit: 20)

  {CYAN}search{RESET} <query> [--verbose]
      Full-text search across name, title, summary, publisher, tags

  {CYAN}search --country{RESET} <code>
      Filter by country code (e.g. us, ru, cn)

  {CYAN}search --tag{RESET} <tag>
      Filter by topic tag (e.g. sanction, role.pep, crime.terror)

  {CYAN}search --type{RESET} <type>
      Filter by dataset type: source, collection

  {CYAN}show{RESET} <name> [--verbose]
      Show details for a specific dataset by name

  {CYAN}stats{RESET}
      Show overall statistics and top datasets

  {CYAN}tags{RESET}
      List all available topic tags

  {CYAN}help{RESET}
      Show this help

{BOLD}EXAMPLES{RESET}
  python sanctions.py list --limit 50
  python sanctions.py search russia
  python sanctions.py search --country us
  python sanctions.py search --tag sanction
  python sanctions.py show us_ofac_sdn --verbose
  python sanctions.py stats
""")


def main():
    args = sys.argv[1:]

    if not args or args[0] in ("help", "--help", "-h"):
        show_help()
        return

    index = fetch_index()
    datasets = index["datasets"]
    cmd = args[0]

    if cmd == "list":
        limit = 20
        if "--limit" in args:
            i = args.index("--limit")
            limit = int(args[i + 1]) if i + 1 < len(args) else 20
        list_datasets(datasets, limit=limit)

    elif cmd == "search":
        rest = args[1:]
        verbose = "--verbose" in rest
        if verbose:
            rest.remove("--verbose")

        field = None
        for flag in ("--country", "--tag", "--type"):
            if flag in rest:
                field = flag.lstrip("-")
                i = rest.index(flag)
                rest = rest[:i] + rest[i + 1:]
                break

        if not rest:
            print(f"{RED}Error:{RESET} provide a search query")
            return

        query = " ".join(rest)
        results = search_datasets(datasets, query, field=field)

        if not results:
            print(f"\n{YELLOW}No results for:{RESET} {query}")
            return

        print(f"\n{BOLD}Results for '{query}'{RESET}  {DIM}({len(results)} found){RESET}")
        for ds in results:
            print_dataset(ds, verbose=verbose)

    elif cmd == "show":
        if len(args) < 2:
            print(f"{RED}Error:{RESET} provide a dataset name")
            return
        name = args[1]
        verbose = "--verbose" in args
        match = next((d for d in datasets if d["name"] == name), None)
        if not match:
            # fuzzy fallback
            candidates = [d for d in datasets if name.lower() in d["name"].lower()]
            if candidates:
                print(f"\n{YELLOW}'{name}' not found. Did you mean:{RESET}")
                for c in candidates[:5]:
                    print(f"  {CYAN}{c['name']}{RESET} — {c['title']}")
            else:
                print(f"{RED}Dataset '{name}' not found.{RESET}")
            return
        print_dataset(match, verbose=verbose)

    elif cmd == "stats":
        show_stats(datasets)

    elif cmd == "tags":
        # Collect all tags actually used in datasets
        tag_counts = {}
        for ds in datasets:
            if ds.get("hidden") or ds.get("deprecated"):
                continue
            for tag in ds.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        print(f"\n{BOLD}Topic Tags ({len(sorted_tags)}){RESET}\n")
        for tag, count in sorted_tags:
            print(f"  {YELLOW}{tag:<35}{RESET} {DIM}{count} datasets{RESET}")

    else:
        print(f"{RED}Unknown command: {cmd}{RESET}")
        show_help()


if __name__ == "__main__":
    main()
