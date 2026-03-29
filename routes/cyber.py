"""
Blueprint: cyber_bp
Routes: /api/cyber
Helpers: is_cyber_dataset, cyber_category
Constants: CYBER_TITLE_KEYWORDS, CYBER_DESC_KEYWORDS, CYBER_TAGS, CYBER_NAME_ALLOWLIST
"""

from flask import Blueprint, jsonify, request
from data import fetch_index, visible_datasets, serialize_dataset, _get_entities, _get_entities_batch

cyber_bp = Blueprint("cyber_bp", __name__)

# Keywords matched only against name + title + summary (not full description)
CYBER_TITLE_KEYWORDS = [
    "crypto", "cryptocurrency", "wallet", "bitcoin", "blockchain",
    "ransomware", "cyber", "hacking", "malware", "lazarus",
    "darknet", "digital currency", "virtual currency", "nft", "defi",
]
# Keywords that can also match the description when title/summary don't hit
CYBER_DESC_KEYWORDS = [
    "cryptocurrency wallet", "bitcoin address", "ransomware address",
    "cyber actor", "cyber attack", "crypto wallet",
]
CYBER_TAGS = {"sector.crypto"}
# Explicit name allowlist catches well-known datasets that might slip through
CYBER_NAME_ALLOWLIST = {
    "us_fbi_lazarus_crypto", "il_mod_crypto", "ransomwhere",
    "us_cyber_sanctions", "ofac_cyber",
}


def is_cyber_dataset(ds):
    if ds.get("name") in CYBER_NAME_ALLOWLIST:
        return True
    if CYBER_TAGS.intersection(set(ds.get("tags", []))):
        return True
    # Tight match: name + title + summary only
    short_text = " ".join([
        ds.get("name", ""),
        ds.get("title", ""),
        ds.get("summary", ""),
    ]).lower()
    if any(kw in short_text for kw in CYBER_TITLE_KEYWORDS):
        return True
    # Loose match: full description, but only for very specific phrases
    desc = (ds.get("description", "") or "").lower()
    if any(kw in desc for kw in CYBER_DESC_KEYWORDS):
        return True
    return False


def cyber_category(ds):
    """Return a human-readable threat category label."""
    short_text = " ".join([
        ds.get("name", ""),
        ds.get("title", ""),
        ds.get("summary", ""),
    ]).lower()
    tags = set(ds.get("tags", []))

    if "sector.crypto" in tags or any(k in short_text for k in ["wallet", "bitcoin", "blockchain", "digital currency", "virtual currency", "nft", "defi", "crypto"]):
        if any(k in short_text for k in ["ransomware", "ransom"]):
            return "ransomware"
        return "crypto"
    if any(k in short_text for k in ["ransomware", "ransom"]):
        return "ransomware"
    if any(k in short_text for k in ["lazarus", "dprk", "north korea"]):
        return "state-sponsored"
    if any(k in short_text for k in ["hacking", "hack", "malware", "cyber", "intrusion"]):
        return "cyber"
    if any(k in short_text for k in ["darknet", "dark web"]):
        return "darknet"
    return "other"


@cyber_bp.route("/api/cyber")
def api_cyber():
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    results = [ds for ds in datasets if is_cyber_dataset(ds)]
    serialized = []
    for ds in results:
        s = serialize_dataset(ds)
        s["cyber_category"] = cyber_category(ds)
        serialized.append(s)
    # Sort: crypto first, then by entity count desc
    order = ["crypto", "ransomware", "state-sponsored", "cyber", "darknet", "other"]
    serialized.sort(key=lambda d: (order.index(d["cyber_category"]), -d.get("entity_count", 0)))

    total_entities = sum(d.get("entity_count", 0) for d in serialized)
    total_targets = sum(d.get("target_count", 0) for d in serialized)
    category_counts = {}
    for d in serialized:
        c = d["cyber_category"]
        category_counts[c] = category_counts.get(c, 0) + 1

    return jsonify({
        "datasets": serialized,
        "total_entities": total_entities,
        "total_targets": total_targets,
        "category_counts": category_counts,
    })


# Datasets to scan for crypto wallet entities — cyber-specific lists + major
# sanctions lists that frequently include crypto addresses as linked records.
CRYPTO_SCAN_DATASETS = [
    "us_ofac_sdn", "us_ofac_cons", "un_sc_sanctions", "eu_sanctions_map",
    "gb_hmt_sanctions", "gb_fcdo_sanctions", "ch_seco_sanctions",
    "us_fbi_lazarus_crypto", "il_mod_crypto", "ransomwhere",
    "ua_nsdc_sanctions", "ca_dfatd_sema_sanctions",
]


def _is_crypto_entity(row):
    """Return True if the flattened entity record is a crypto wallet / address."""
    return (
        row.get("schema") == "CryptoWallet"
        or bool(row.get("publicKey"))
        or bool(row.get("currency"))
    )


@cyber_bp.route("/api/crypto-wallets")
def api_crypto_wallets():
    """
    Scan entity records across major sanctions datasets and return all
    CryptoWallet entries (schema=CryptoWallet or has publicKey/currency).
    Results are cached in _entity_cache via _get_entities.
    """
    extra = request.args.get("datasets", "")
    ds_names = list(dict.fromkeys(
        CRYPTO_SCAN_DATASETS + [d.strip() for d in extra.split(",") if d.strip()]
    ))

    results = []
    searched = []
    for name in ds_names:
        rows = _get_entities(name)
        if rows:
            searched.append(name)
        for row in rows:
            if _is_crypto_entity(row):
                results.append(dict(row, _dataset=name))

    # Sort: schema first (CryptoWallet on top), then by dataset
    results.sort(key=lambda r: (r.get("schema") != "CryptoWallet", r.get("_dataset", "")))

    return jsonify({"results": results, "searched": searched, "total": len(results)})


_COUNTRY_NAMES = {
    "af":"Afghanistan","al":"Albania","dz":"Algeria","ao":"Angola","am":"Armenia",
    "au":"Australia","at":"Austria","az":"Azerbaijan","bh":"Bahrain","by":"Belarus",
    "be":"Belgium","bz":"Belize","bo":"Bolivia","ba":"Bosnia","br":"Brazil",
    "bg":"Bulgaria","kh":"Cambodia","ca":"Canada","cf":"Cent. Africa","cn":"China",
    "co":"Colombia","cd":"Congo (DRC)","cu":"Cuba","cz":"Czechia","dk":"Denmark",
    "eg":"Egypt","et":"Ethiopia","fi":"Finland","fr":"France","de":"Germany",
    "gh":"Ghana","gr":"Greece","gt":"Guatemala","gy":"Guyana","hk":"Hong Kong",
    "hu":"Hungary","in":"India","id":"Indonesia","ir":"Iran","iq":"Iraq",
    "il":"Israel","it":"Italy","jm":"Jamaica","jp":"Japan","jo":"Jordan",
    "kz":"Kazakhstan","ke":"Kenya","kp":"North Korea","kr":"South Korea",
    "kw":"Kuwait","kg":"Kyrgyzstan","la":"Laos","lb":"Lebanon","ly":"Libya",
    "lt":"Lithuania","lu":"Luxembourg","my":"Malaysia","ml":"Mali","mt":"Malta",
    "mx":"Mexico","md":"Moldova","ma":"Morocco","mm":"Myanmar","na":"Namibia",
    "np":"Nepal","nl":"Netherlands","nz":"New Zealand","ni":"Nicaragua",
    "ng":"Nigeria","no":"Norway","pk":"Pakistan","ps":"Palestine","pa":"Panama",
    "pe":"Peru","ph":"Philippines","pl":"Poland","pt":"Portugal","qa":"Qatar",
    "ro":"Romania","ru":"Russia","sa":"Saudi Arabia","rs":"Serbia",
    "sl":"Sierra Leone","sg":"Singapore","so":"Somalia","za":"South Africa",
    "ss":"South Sudan","es":"Spain","lk":"Sri Lanka","sd":"Sudan","se":"Sweden",
    "ch":"Switzerland","sy":"Syria","tw":"Taiwan","tj":"Tajikistan","tz":"Tanzania",
    "th":"Thailand","tn":"Tunisia","tr":"Turkey","tm":"Turkmenistan","ug":"Uganda",
    "ua":"Ukraine","ae":"UAE","gb":"United Kingdom","us":"United States",
    "uz":"Uzbekistan","ve":"Venezuela","vn":"Vietnam","ye":"Yemen","zw":"Zimbabwe",
    "kn":"Saint Kitts & Nevis",
}


@cyber_bp.route("/api/stats/crypto-by-country")
def api_crypto_by_country():
    """
    Crypto wallet / address records grouped by entity nationality across ALL
    scanned datasets. For each dataset, cross-references wallet holder names
    against Person/Org entities in the same dataset to derive country.
    """
    batch = _get_entities_batch(CRYPTO_SCAN_DATASETS)

    country_counts = {}
    for ds_name in CRYPTO_SCAN_DATASETS:
        rows = batch.get(ds_name, [])

        # Build name → country from Person/Org entities in this dataset
        name_to_country = {}
        for row in rows:
            if row.get("schema") in ("Person", "Organization", "Company", "LegalEntity"):
                name = (row.get("caption") or "").strip().lower()
                country = (
                    row.get("nationality") or
                    row.get("countries") or
                    row.get("sanction_country") or ""
                )
                if name and country:
                    name_to_country[name] = country.split(";")[0].strip().lower()

        for row in rows:
            if not _is_crypto_entity(row):
                continue
            holder = (row.get("holder") or "").strip().lower()
            country = (
                name_to_country.get(holder) or
                (row.get("countries") or "").split(";")[0].strip().lower() or
                (row.get("nationality") or "").split(";")[0].strip().lower() or
                (row.get("sanction_country") or "").split(";")[0].strip().lower() or
                "unknown"
            )
            country_counts[country] = country_counts.get(country, 0) + 1

    ranked = sorted(country_counts.items(), key=lambda x: -x[1])[:20]
    return jsonify([
        {"label": _COUNTRY_NAMES.get(c, c.title()) if c != "unknown" else "Unknown", "value": n}
        for c, n in ranked
    ])


@cyber_bp.route("/api/stats/sdn-crypto-country")
def api_sdn_crypto_country():
    """
    Return CryptoWallet counts from OFAC SDN grouped by the holder's nationality.
    Cross-references wallet holder names against Person/Org entities in the same dataset.
    """
    rows = _get_entities("us_ofac_sdn")

    # Build caption → countries mapping from Person / Org entities
    name_to_country = {}
    for row in rows:
        if row.get("schema") in ("Person", "Organization", "Company", "LegalEntity"):
            name = (row.get("caption") or "").strip().lower()
            country = row.get("countries") or row.get("nationality") or ""
            if name and country:
                # take first country if semicolon-separated
                name_to_country[name] = country.split(";")[0].strip()

    country_counts = {}
    for row in rows:
        if not _is_crypto_entity(row):
            continue
        holder = (row.get("holder") or "").strip().lower()
        country = name_to_country.get(holder) or row.get("countries") or "Unknown"
        country_counts[country] = country_counts.get(country, 0) + 1

    ranked = sorted(country_counts.items(), key=lambda x: -x[1])[:20]
    return jsonify([
        {"label": _COUNTRY_NAMES.get(c.lower(), c), "value": n}
        for c, n in ranked
    ])


@cyber_bp.route("/api/cyber-records")
def api_cyber_records():
    """Return all entity records from every cyber/crypto dataset."""
    index = fetch_index()
    datasets = visible_datasets(index["datasets"])
    cyber_ds_names = [ds["name"] for ds in datasets if is_cyber_dataset(ds)]

    results = []
    searched = []
    for name in cyber_ds_names:
        rows = _get_entities(name)
        if rows:
            searched.append(name)
        for row in rows:
            results.append(dict(row, _dataset=name))

    return jsonify({"results": results, "searched": searched, "total": len(results)})
