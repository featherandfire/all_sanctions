let _cyberTab = 'datasets';   // 'datasets' | 'records' | 'crypto'
let _cyberMeta = null;        // cached cyber API response
let _cyberFilterTimer = null;
let _cwFilterTimer = null;

async function renderCyberView(tab) {
  if (tab) _cyberTab = tab;
  const content = document.getElementById('content');

  if (!_cyberMeta) {
    content.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Loading cyber &amp; crypto datasets…</div></div>`;
    const res = await fetch('/api/cyber');
    _cyberMeta = await res.json();
  }
  const { datasets, total_entities, total_targets, sdn_crypto_count } = _cyberMeta;

  // Tab bar
  const tabBar = `
    <div class="med-tab-bar">
      <button onclick="renderCyberView('datasets')" class="med-tab-btn${_cyberTab==='datasets'?' active':''}">Datasets</button>
      <button onclick="renderCyberView('records')"  class="med-tab-btn${_cyberTab==='records'?' active':''}">Records</button>
      <button onclick="renderCyberView('crypto')"   class="med-tab-btn${_cyberTab==='crypto'?' active':''}">₿ Crypto Addresses</button>
    </div>`;

  // Stat strip
  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px;grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="stat-value">${datasets.length}</div><div class="stat-label">Datasets</div></div>
      <div class="stat-card"><div class="stat-value">${total_entities.toLocaleString()}</div><div class="stat-label">Total Entities</div></div>
      <div class="stat-card"><div class="stat-value">${total_targets.toLocaleString()}</div><div class="stat-label">Total Targets</div></div>
      <div class="stat-card" onclick="renderCyberView('crypto')" style="cursor:pointer">
        <div class="stat-value">${sdn_crypto_count != null ? sdn_crypto_count.toLocaleString() : '—'}</div>
        <div class="stat-label">OFAC SDN Crypto Addresses</div>
        <div style="font-size:10px;color:var(--muted)">CryptoWallet records on SDN list</div>
      </div>
    </div>`;

  let bodyHtml;
  if (_cyberTab === 'datasets') {
    const categoryRows = `
      <div class="country-row med-state-row" data-dsname="all" onclick="cyberFilter('all')"
        style="background:var(--surface2);border-left:3px solid var(--accent)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--text);font-weight:600" class="cyber-cat-label">All Lists</div>
          <div class="med-state-subtext">${datasets.length} datasets</div>
        </div>
      </div>
      ${datasets.map(ds => {
        const m = CATEGORY_META[ds.cyber_category] || CATEGORY_META['other'];
        return `<div class="country-row med-state-row" data-dsname="${esc(ds.name)}" onclick="cyberFilter('${esc(ds.name)}')"
          style="border-left:3px solid transparent">
          <span style="font-size:14px;line-height:1;flex-shrink:0">${m.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--muted);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" class="cyber-cat-label" title="${esc(ds.title)}">${esc(ds.title)}</div>
            <div class="med-state-subtext">${ds.entity_count ? ds.entity_count.toLocaleString() + ' entities' : ds.name}</div>
          </div>
        </div>`;
      }).join('')}`;

    const cards = datasets.map(ds => renderCyberCard(ds)).join('');
    window._cyberAllCards = cards;

    bodyHtml = tabBar + statStrip + `
      <div class="med-split-layout">
        <div class="med-state-panel">
          <div class="med-state-panel-header">
            <div style="position:relative">
              <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="cyber-ds-search" type="text" placeholder="Filter lists…" oninput="filterCyberDatasets(this.value)"
                class="med-search-input" style="width:100%">
            </div>
          </div>
          <div id="cyber-cat-list">${categoryRows}</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px 24px" id="cyber-datasets-panel">
          <div id="cyber-cards">${cards}</div>
        </div>
      </div>`;

  } else if (_cyberTab === 'crypto') {
    bodyHtml = tabBar + statStrip + `
      <div class="med-split-layout">

        <!-- Left: pie charts panel -->
        <div class="med-state-panel" style="width:280px;overflow-y:auto">
          <div class="med-state-panel-header">
            <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">By Currency Type</div>
            <span id="cw-currency-filter-badge" style="display:none;margin-top:6px;padding:2px 8px;background:var(--yellow);color:#000;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;display:none" onclick="cwClearCurrencyFilter()">× clear filter</span>
          </div>
          <div style="padding:16px">
            <div id="cw-pie-currency" class="med-chart-host" style="flex-direction:column;align-items:flex-start;gap:8px"><div class="med-placeholder-text">Loading…</div></div>
          </div>
          <div style="padding:0 16px 8px">
            <div class="med-chart-label">By Dataset</div>
            <div id="cw-pie-dataset" class="med-chart-host" style="flex-direction:column;align-items:flex-start;gap:8px"><div class="med-placeholder-text">Loading…</div></div>
          </div>
        </div>

        <!-- Right: table panel -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px" id="cyber-crypto-panel">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--yellow)">₿ Crypto Address Records</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">CryptoWallet entities from OFAC SDN, UN, EU, UK &amp; more</div>
            </div>
            <div style="margin-left:auto;position:relative">
              <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="cw-search" type="text" placeholder="Filter addresses…" oninput="filterCryptoWallets(this.value, window.cryptoWalletData)"
                class="med-search-input" style="width:200px;padding-left:28px">
            </div>
          </div>
          <div id="crypto-wallets-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading crypto address records…</div></div></div>
        </div>
      </div>`;
  } else {
    // Records tab — full entity table from all cyber datasets
    bodyHtml = tabBar + statStrip + `
      <div class="med-split-layout">
        <div class="med-state-panel" style="width:200px">
          <div class="med-state-panel-header">
            <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">Dataset Records</div>
          </div>
          <div style="padding:14px 12px">
            <div style="font-size:12px;color:var(--muted);line-height:1.6">All entity records from every active cyber &amp; crypto dataset combined.</div>
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px 24px">
          <div id="cyber-records-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading all records from cyber datasets… this may take a moment</div></div></div>
        </div>
      </div>`;
  }

  if (!BannerAnimation.isActive() || !document.getElementById('cyber-banner-canvas')) {
    content.innerHTML = `<div class="home-banner-wrap home-banner-wrap--sm"><canvas id="cyber-banner-canvas"></canvas></div><div id="cyber-body">${bodyHtml}</div>`;
    BannerAnimation.init(document.getElementById('cyber-banner-canvas'));
  } else {
    document.getElementById('cyber-body').innerHTML = bodyHtml;
  }

  if (_cyberTab === 'crypto') { _cwActiveCurrency = null; loadCryptoWallets(); }
  else if (_cyberTab === 'records') await loadCyberRecords();
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

let _cwActiveCurrency = null;

async function loadCryptoWallets() {
  const body = document.getElementById('crypto-wallets-body');
  if (!body) return;

  if (window.cryptoWalletData) {
    const { results, cols } = window.cryptoWalletData;
    const shown = _cwActiveCurrency ? results.filter(r => _currencyLabel(r.currency || 'Unknown') === _cwActiveCurrency) : results;
    body.innerHTML = _cryptoTableHTML(shown, cols, shown.length);
    _cwDrawCharts(results);
    return;
  }

  const res = await fetch('/api/crypto-wallets');
  const data = await res.json();

  if (!data.results.length) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">₿</div><div>No crypto wallet records found</div></div>`;
    return;
  }

  const CRYPTO_COLS = ['schema', 'caption', 'publicKey', 'currency', 'holder', 'holder_alias',
    'sanction_authority', 'sanction_program', 'sanction_country', 'sanction_startDate',
    'sanction_reason', 'sanction_sourceUrl', '_dataset', 'first_seen', 'id'];
  const allKeys = new Set(data.results.flatMap(r => Object.keys(r)));
  const cols = CRYPTO_COLS.filter(k => allKeys.has(k));
  allKeys.forEach(k => { if (!cols.includes(k)) cols.push(k); });

  window.cryptoWalletData = { results: data.results, cols, total: data.results.length, searched: data.searched };
  body.innerHTML = _cryptoTableHTML(data.results, cols, data.results.length, data.searched);
  _cwDrawCharts(data.results);
}

const CURRENCY_NAMES = {
  'BTC':    'Bitcoin',
  'XBT':    'Bitcoin',
  'ETH':    'Ethereum',
  'USDT':   'Tether (USDT)',
  'USDC':   'USD Coin (USDC)',
  'XMR':    'Monero',
  'BCH':    'Bitcoin Cash',
  'LTC':    'Litecoin',
  'DOGE':   'Dogecoin',
  'ZEC':    'Zcash',
  'DASH':   'Dash',
  'ETC':    'Ethereum Classic',
  'TRX':    'TRON',
  'SOL':    'Solana',
  'XRP':    'XRP (Ripple)',
  'ADA':    'Cardano',
  'DOT':    'Polkadot',
  'MATIC':  'Polygon (MATIC)',
  'ALGO':   'Algorand',
  'ATOM':   'Cosmos',
  'AVAX':   'Avalanche',
  'LINK':   'Chainlink',
  'UNI':    'Uniswap',
  'SHIB':   'Shiba Inu',
  'BUSD':   'Binance USD',
  'BNB':    'Binance Coin',
  'DAI':    'Dai',
  'WBTC':   'Wrapped Bitcoin',
  'BSV':    'Bitcoin SV',
  'XLM':    'Stellar Lumens',
  'VET':    'VeChain',
  'UNKNOWN': 'Unknown',
};

function _currencyLabel(code) {
  return CURRENCY_NAMES[code.toUpperCase()] || code;
}

const CURRENCY_COLORS = {
  'Bitcoin':           '#facc15',
  'Ethereum':          '#60a5fa',
  'Tether (USDT)':     '#34d399',
  'USD Coin (USDC)':   '#34d399',
  'Monero':            '#f97316',
  'Bitcoin Cash':      '#a78bfa',
  'Litecoin':          '#9ca3af',
  'Dogecoin':          '#facc15',
  'Zcash':             '#ec4899',
  'Dash':              '#06b6d4',
  'Ethereum Classic':  '#60a5fa',
  'TRON':              '#ef4444',
  'Solana':            '#a78bfa',
  'XRP (Ripple)':      '#60a5fa',
  'Unknown':           '#9ca3af',
};

function _cwDrawCharts(results) {
  // ── Currency pie ────────────────────────────────────────────────────────
  const currEl = document.getElementById('cw-pie-currency');
  if (currEl) {
    currEl.innerHTML = '';
    currEl.style.flexDirection = 'column';
    const currMap = {};
    for (const r of results) {
      const c = _currencyLabel(r.currency || 'Unknown');
      currMap[c] = (currMap[c] || 0) + 1;
    }
    const currData = Object.entries(currMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    if (!currData.length) {
      currEl.innerHTML = '<div class="med-placeholder-text">No data available</div>';
    } else {
      drawPieChart('cw-pie-currency', currData, null, {
        unit: 'addresses',
        centerLabel: 'records',
        legendFmt: (_v, pct) => pct + '%',
        colorMap: CURRENCY_COLORS,
        onClick: (label) => cwFilterByCurrency(label),
      });
    }
  }

  // ── Dataset pie ─────────────────────────────────────────────────────────
  const dsEl = document.getElementById('cw-pie-dataset');
  if (dsEl) {
    dsEl.innerHTML = '';
    dsEl.style.flexDirection = 'column';
    const dsMap = {};
    for (const r of results) {
      const d = r._dataset || 'Unknown';
      dsMap[d] = (dsMap[d] || 0) + 1;
    }
    const dsData = Object.entries(dsMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    if (!dsData.length) {
      dsEl.innerHTML = '<div class="med-placeholder-text">No data available</div>';
    } else {
      drawPieChart('cw-pie-dataset', dsData, null, {
        unit: 'addresses',
        centerLabel: 'datasets',
        legendFmt: (_v, pct) => pct + '%',
      });
    }
  }
}

function cwFilterByCurrency(currency) {
  const data = window.cryptoWalletData;
  if (!data) return;
  _cwActiveCurrency = currency;
  const badge = document.getElementById('cw-currency-filter-badge');
  if (badge) { badge.textContent = `× ${currency}`; badge.style.display = 'inline'; }
  const filtered = data.results.filter(r => _currencyLabel(r.currency || 'Unknown') === currency);
  const body = document.getElementById('crypto-wallets-body');
  if (body) body.innerHTML = _cryptoTableHTML(filtered, data.cols, filtered.length);
}

function cwClearCurrencyFilter() {
  const data = window.cryptoWalletData;
  if (!data) return;
  _cwActiveCurrency = null;
  const badge = document.getElementById('cw-currency-filter-badge');
  if (badge) badge.style.display = 'none';
  const body = document.getElementById('crypto-wallets-body');
  if (body) body.innerHTML = _cryptoTableHTML(data.results, data.cols, data.results.length, data.searched);
}

function _cryptoTableHTML(results, cols, total, searched) {
  const countLine = `<div style="font-size:12px;color:var(--muted);margin-bottom:10px">
    <strong style="color:var(--text)">${total.toLocaleString()}</strong> crypto address records
    ${searched ? `across <strong style="color:var(--text)">${searched.length}</strong> datasets` : ''}
  </div>`;
  return countLine + `<div style="overflow-x:auto"><table id="cw-table" style="width:100%;border-collapse:collapse;font-size:12px">${buildCryptoTable(results, cols)}</table></div>`;
}

function filterCryptoWallets(q, data) {
  clearTimeout(_cwFilterTimer);
  _cwFilterTimer = setTimeout(() => {
    if (!data) return;
    const lower = q.toLowerCase().trim();
    const filtered = lower
      ? data.results.filter(r => Object.values(r).some(v => v && String(v).toLowerCase().includes(lower)))
      : data.results;
    const body = document.getElementById('crypto-wallets-body');
    if (body) body.innerHTML = _cryptoTableHTML(filtered, data.cols, filtered.length);
  }, 200);
}

function renderCyberCard(ds) {
  const statusColor = ds.result === 'success' ? 'var(--green)' : ds.result ? 'var(--red)' : 'var(--muted)';
  const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
  const tags = (ds.tags || []).slice(0, 4).map(t =>
    `<span style="padding:2px 7px;background:var(--tag-bg);color:var(--tag-text);border-radius:10px;font-size:10px">${esc(t)}</span>`
  ).join(' ');
  const pub = ds.publisher_name
    ? `${ds.publisher_name}${ds.publisher_country_label ? ` · ${ds.publisher_country_label}` : ''}`
    : '';

  return `<div class="dataset-card" style="margin-bottom:10px" data-cat="${ds.cyber_category}" data-name="${ds.name}" onclick="showDetail('${ds.name}')">
    <div class="card-header">
      <div style="flex:1">
        <div class="card-title">${esc(ds.title)}</div>
        <div class="card-name">${esc(ds.name)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span style="font-size:10px;color:${statusColor}">${ds.result || '—'}</span>
        <div class="status-dot ${statusClass}"></div>
      </div>
    </div>
    ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
    <div class="card-meta">
      ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
      ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
      ${pub ? `<div class="meta-item">${esc(pub)}</div>` : ''}
      ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
      ${ds.frequency  ? `<div class="meta-item">${ds.frequency}</div>` : ''}
    </div>
    ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
  </div>`;
}

function filterCyberDatasets(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('#cyber-cat-list .country-row').forEach(row => {
    const label = row.querySelector('.cyber-cat-label');
    const text = (label?.textContent || '').toLowerCase();
    row.style.display = text.includes(lower) ? '' : 'none';
  });
}

function cyberFilter(dsname) {
  document.querySelectorAll('#cyber-cat-list .country-row').forEach(row => {
    const isActive = row.dataset.dsname === dsname;
    row.style.background = isActive ? 'var(--surface2)' : 'transparent';
    row.style.borderLeft = `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`;
    const label = row.querySelector('.cyber-cat-label');
    if (label) { label.style.color = isActive ? 'var(--text)' : 'var(--muted)'; label.style.fontWeight = isActive ? '600' : '400'; }
  });

  const panel = document.getElementById('cyber-datasets-panel');
  if (!panel) return;

  if (dsname === 'all') {
    panel.innerHTML = `<div id="cyber-cards">${window._cyberAllCards || ''}</div>`;
    return;
  }

  // Find the dataset object from cached meta
  const ds = (_cyberMeta && _cyberMeta.datasets || []).find(d => d.name === dsname);
  const cardHtml = ds ? `<div style="margin-top:20px">${renderCyberCard(ds)}</div>` : '';

  panel.innerHTML = `
    <div class="med-sector-grid">
      <div>
        <div class="med-chart-label">By Currency Type</div>
        <div id="cyber-ds-pie-currency" class="med-chart-host"><div class="med-placeholder-text">Loading…</div></div>
      </div>
      <div>
        <div class="med-chart-label">By Schema Type</div>
        <div id="cyber-ds-pie-schema" class="med-chart-host"><div class="med-placeholder-text">Loading…</div></div>
      </div>
    </div>${cardHtml}`;

  // Use cached crypto data if already loaded, otherwise fetch for this dataset
  const cached = window.cryptoWalletData;
  if (cached) {
    const rows = cached.results.filter(r => r._dataset === dsname);
    _cyberRenderDsPies(rows);
  } else {
    fetch(`/api/crypto-wallets?datasets=${encodeURIComponent(dsname)}`)
      .then(r => r.json())
      .then(data => {
        const rows = (data.results || []).filter(r => r._dataset === dsname);
        _cyberRenderDsPies(rows);
      });
  }
}

function _cyberRenderDsPies(rows) {
  // Currency pie
  const currEl = document.getElementById('cyber-ds-pie-currency');
  if (currEl) {
    currEl.innerHTML = '';
    const currMap = {};
    for (const r of rows) {
      const c = _currencyLabel(r.currency || 'Unknown');
      currMap[c] = (currMap[c] || 0) + 1;
    }
    const currData = Object.entries(currMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    if (!currData.length) {
      currEl.innerHTML = '<div class="med-placeholder-text">No data available</div>';
    } else {
      drawPieChart('cyber-ds-pie-currency', currData, null, {
        unit: 'addresses', centerLabel: 'records',
        legendFmt: (_v, pct) => pct + '%',
        colorMap: CURRENCY_COLORS,
      });
    }
  }

  // Schema pie
  const schemaEl = document.getElementById('cyber-ds-pie-schema');
  if (schemaEl) {
    schemaEl.innerHTML = '';
    const schemaMap = {};
    for (const r of rows) {
      const s = r.schema || 'Unknown';
      schemaMap[s] = (schemaMap[s] || 0) + 1;
    }
    const schemaData = Object.entries(schemaMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
    if (!schemaData.length) {
      schemaEl.innerHTML = '<div class="med-placeholder-text">No data available</div>';
    } else {
      drawPieChart('cyber-ds-pie-schema', schemaData, null, {
        unit: 'records', centerLabel: 'types',
        legendFmt: (_v, pct) => pct + '%',
        colorMap: SCHEMA_COLORS,
      });
    }
  }
}
