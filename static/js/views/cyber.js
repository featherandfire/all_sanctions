let _cyberTab = 'datasets';   // 'datasets' | 'records'
let _cyberMeta = null;        // cached cyber API response
let _cyberFilterTimer = null;
let _cwFilterTimer = null;

async function renderCyberView(tab) {
  if (tab) _cyberTab = tab;
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Loading cyber &amp; crypto datasets…</div></div>`;

  if (!_cyberMeta) {
    const res = await fetch('/api/cyber');
    _cyberMeta = await res.json();
  }
  const { datasets, total_entities, total_targets, category_counts } = _cyberMeta;

  // Tab bar
  const tabBar = `
    <div style="display:flex;gap:2px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0">
      <button onclick="renderCyberView('datasets')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='datasets'?'var(--accent)':'transparent'};background:none;color:${_cyberTab==='datasets'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='datasets'?'600':'400'}">
        Datasets
      </button>
      <button onclick="renderCyberView('records')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='records'?'var(--accent)':'transparent'};background:none;color:${_cyberTab==='records'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='records'?'600':'400'}">
        Records
      </button>
    </div>`;

  // Stat strip
  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-label">Datasets</div><div class="stat-value accent">${datasets.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Entities</div><div class="stat-value" style="color:var(--yellow)">${total_entities.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Targets</div><div class="stat-value green">${total_targets.toLocaleString()}</div></div>
    </div>`;

  if (_cyberTab === 'datasets') {
    const allCategories = Object.keys(CATEGORY_META).filter(c => category_counts[c]);
    const filterPills = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;align-items:center">
        <span style="font-size:12px;color:var(--muted);margin-right:4px">Filter:</span>
        <button class="cyber-filter active" data-cat="all" onclick="cyberFilter('all')"
          style="padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:var(--accent);color:#fff;font-size:12px;cursor:pointer">
          All (${datasets.length})
        </button>
        ${allCategories.map(c => {
          const m = CATEGORY_META[c];
          return `<button class="cyber-filter" data-cat="${c}" onclick="cyberFilter('${c}')"
            style="padding:5px 14px;border-radius:20px;border:1px solid ${m.color}33;background:${m.color}18;color:${m.color};font-size:12px;cursor:pointer">
            ${m.icon} ${m.label} (${category_counts[c]})
          </button>`;
        }).join('')}
      </div>`;

    const cards = datasets.map(ds => renderCyberCard(ds)).join('');

    const cryptoSection = `
      <div id="crypto-wallets-section" style="margin-top:32px;border-top:1px solid var(--border);padding-top:24px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--yellow)">₿ Crypto Address Records from Sanctions Lists</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">CryptoWallet entities extracted from OFAC SDN, UN, EU, UK, and more</div>
          </div>
          <button id="load-crypto-btn" onclick="loadCryptoWallets()"
            style="margin-left:auto;padding:7px 16px;background:var(--yellow);color:#000;border:none;border-radius:var(--radius);font-size:12px;font-weight:600;cursor:pointer">
            Load Crypto Addresses
          </button>
        </div>
        <div id="crypto-wallets-body"></div>
      </div>`;

    content.innerHTML = tabBar + statStrip + filterPills + `<div class="cards-grid" id="cyber-cards">${cards}</div>` + cryptoSection;

  } else {
    // Records tab — full entity table from all cyber datasets
    content.innerHTML = tabBar + statStrip + `<div id="cyber-records-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading all records from cyber datasets… this may take a moment</div></div></div>`;
    await loadCyberRecords();
  }
}

async function loadCyberRecords() {
  const body = document.getElementById('cyber-records-body');
  const res = await fetch('/api/cyber-records');
  const data = await res.json();

  if (!data.results.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div>No records found</div></div>`;
    return;
  }

  // Derive columns: priority order, then remainder alphabetically
  const allKeys = new Set(data.results.flatMap(r => Object.keys(r)));
  const cols = ES_COL_PRIORITY.filter(k => allKeys.has(k));
  allKeys.forEach(k => { if (!cols.includes(k)) cols.push(k); });

  window._cyberRecordsData = { results: data.results, cols };

  const header = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--muted)">
        <strong style="color:var(--text)">${data.total.toLocaleString()}</strong> records across
        <strong style="color:var(--text)">${data.searched.length}</strong> datasets:
        <span style="color:var(--accent);font-size:11px;font-family:monospace">${data.searched.join(', ')}</span>
      </span>
      <div style="position:relative;margin-left:auto">
        <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Filter records…" oninput="filterCyberRecords(this.value)"
          style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px 6px 28px;font-size:12px;color:var(--text);outline:none;width:220px">
      </div>
    </div>`;

  body.innerHTML = header + `<div style="overflow-x:auto"><table id="cr-table" style="width:100%;border-collapse:collapse;font-size:12px">${buildCyberRecordsTable(data.results, cols)}</table></div>`;
}

function filterCyberRecords(q) {
  clearTimeout(_cyberFilterTimer);
  _cyberFilterTimer = setTimeout(() => {
    const d = window._cyberRecordsData;
    if (!d) return;
    const lower = q.toLowerCase().trim();
    const filtered = lower
      ? d.results.filter(r => Object.values(r).some(v => v && String(v).toLowerCase().includes(lower)))
      : d.results;
    const tbl = document.getElementById('cr-table');
    if (tbl) tbl.innerHTML = buildCyberRecordsTable(filtered, d.cols);
  }, 200);
}

async function loadCryptoWallets() {
  const btn = document.getElementById('load-crypto-btn');
  const body = document.getElementById('crypto-wallets-body');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  body.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Scanning datasets for crypto wallet records… (may take a moment on first load)</div></div>`;

  const res = await fetch('/api/crypto-wallets');
  const data = await res.json();

  if (btn) btn.style.display = 'none';

  if (!data.results.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">₿</div><div>No crypto wallet records found</div></div>`;
    return;
  }

  // Columns to show for crypto wallet records
  const CRYPTO_COLS = ['schema', 'caption', 'publicKey', 'currency', 'holder', 'holder_alias',
    'sanction_authority', 'sanction_program', 'sanction_country', 'sanction_startDate',
    'sanction_reason', 'sanction_sourceUrl', '_dataset', 'first_seen', 'id'];
  const allKeys = new Set(data.results.flatMap(r => Object.keys(r)));
  const cols = CRYPTO_COLS.filter(k => allKeys.has(k));
  // Append any remaining keys not in the priority list
  allKeys.forEach(k => { if (!cols.includes(k)) cols.push(k); });

  // Search bar + count header
  const header = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--muted)">
        <strong style="color:var(--text)">${data.results.length.toLocaleString()}</strong> crypto address records across
        <strong style="color:var(--text)">${data.searched.length}</strong> datasets
      </span>
      <div style="position:relative;margin-left:auto">
        <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="cw-search" type="text" placeholder="Filter addresses…" oninput="filterCryptoWallets(this.value, cryptoWalletData)"
          style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px 6px 28px;font-size:12px;color:var(--text);outline:none;width:200px">
      </div>
    </div>`;

  window.cryptoWalletData = { results: data.results, cols };
  body.innerHTML = header + `<div style="overflow-x:auto"><table id="cw-table" style="width:100%;border-collapse:collapse;font-size:12px">${buildCryptoTable(data.results, cols)}</table></div>`;
}

function filterCryptoWallets(q, data) {
  clearTimeout(_cwFilterTimer);
  _cwFilterTimer = setTimeout(() => {
    const lower = q.toLowerCase().trim();
    const filtered = lower
      ? data.results.filter(r => Object.values(r).some(v => v && String(v).toLowerCase().includes(lower)))
      : data.results;
    const tbl = document.getElementById('cw-table');
    if (tbl) tbl.innerHTML = buildCryptoTable(filtered, data.cols);
  }, 200);
}

function renderCyberCard(ds) {
  const meta = CATEGORY_META[ds.cyber_category] || CATEGORY_META['other'];
  const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
  const tags = (ds.tags || []).slice(0, 4).map(t =>
    `<span class="card-tag">${t}</span>`
  ).join('');
  const pub = ds.publisher_name
    ? `${ds.publisher_name}${ds.publisher_country_label ? ` · ${ds.publisher_country_label}` : ''}`
    : '';

  return `<div class="dataset-card" data-cat="${ds.cyber_category}" onclick="showDetail('${ds.name}')">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <span style="font-size:11px;padding:2px 10px;border-radius:12px;background:${meta.color}18;color:${meta.color};border:1px solid ${meta.color}33;font-weight:600">
        ${meta.icon} ${meta.label}
      </span>
      <div class="status-dot ${statusClass}" style="margin-left:auto" title="${ds.result || 'unknown'}"></div>
    </div>
    <div class="card-header" style="margin-bottom:6px">
      <div>
        <div class="card-title">${esc(ds.title)}</div>
        <div class="card-name">${esc(ds.name)}</div>
      </div>
    </div>
    ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
    <div class="card-meta">
      ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
      ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
      ${pub ? `<div class="meta-item">${esc(pub)}</div>` : ''}
      ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
    </div>
    ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
  </div>`;
}

function cyberFilter(cat) {
  document.querySelectorAll('.cyber-filter').forEach(btn => {
    const isActive = btn.dataset.cat === cat;
    btn.style.background = isActive
      ? (cat === 'all' ? 'var(--accent)' : `${(CATEGORY_META[cat]||{}).color || 'var(--accent)'}40`)
      : (btn.dataset.cat === 'all' ? 'transparent' : `${(CATEGORY_META[btn.dataset.cat]||{}).color || '#888'}18`);
    btn.style.color = isActive
      ? (cat === 'all' ? '#fff' : (CATEGORY_META[cat]||{}).color || 'var(--accent)')
      : (CATEGORY_META[btn.dataset.cat]||{}).color || 'var(--muted)';
  });
  document.querySelectorAll('#cyber-cards .dataset-card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
  });
}
