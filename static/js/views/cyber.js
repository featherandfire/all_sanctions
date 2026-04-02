let _cyberTab = 'datasets';   // 'datasets' | 'records' | 'crypto' | 'etherscan'
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
  const { datasets, total_entities, total_targets, category_counts, sdn_crypto_count } = _cyberMeta;

  // Tab bar
  const tabBar = `
    <div style="display:flex;gap:2px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:0">
      <button onclick="renderCyberView('datasets')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='datasets'?'var(--accent)':'transparent'};background:none;color:${_cyberTab==='datasets'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='datasets'?'600':'400'}">
        Datasets
      </button>
      <button onclick="renderCyberView('records')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='records'?'var(--accent)':'transparent'};background:none;color:${_cyberTab==='records'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='records'?'600':'400'}">
        Records
      </button>
      <button onclick="renderCyberView('crypto')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='crypto'?'var(--yellow)':'transparent'};background:none;color:${_cyberTab==='crypto'?'var(--yellow)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='crypto'?'600':'400'}">
        ₿ Crypto Addresses
      </button>
      <button onclick="renderCyberView('etherscan')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_cyberTab==='etherscan'?'var(--yellow)':'transparent'};background:none;color:${_cyberTab==='etherscan'?'var(--yellow)':'var(--muted)'};cursor:pointer;font-weight:${_cyberTab==='etherscan'?'600':'400'}">
        ₿ Etherscan
      </button>
    </div>`;

  // Stat strip
  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-label">Datasets</div><div class="stat-value accent">${datasets.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Entities</div><div class="stat-value" style="color:var(--yellow)">${total_entities.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Targets</div><div class="stat-value green">${total_targets.toLocaleString()}</div></div>
      <div class="stat-card" onclick="renderCyberView('crypto')" style="cursor:pointer;border-color:#c0392b55">
        <div class="stat-label">OFAC SDN Crypto Addresses</div>
        <div class="stat-value" style="color:#e74c3c">${sdn_crypto_count != null ? sdn_crypto_count.toLocaleString() : '—'}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">CryptoWallet records on SDN list</div>
      </div>
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

    content.innerHTML = tabBar + statStrip + filterPills + `<div class="cards-grid" id="cyber-cards">${cards}</div>`;

  } else if (_cyberTab === 'crypto') {
    content.innerHTML = tabBar + `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--yellow)">₿ Crypto Address Records from Sanctions Lists</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">CryptoWallet entities extracted from OFAC SDN, UN, EU, UK, and more</div>
        </div>
        <div style="margin-left:auto;position:relative">
          <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="cw-search" type="text" placeholder="Filter addresses…" oninput="filterCryptoWallets(this.value, window.cryptoWalletData)"
            style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:7px 10px 7px 28px;font-size:12px;color:var(--text);outline:none;width:220px">
        </div>
      </div>
      <div id="crypto-wallets-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading crypto address records…</div></div></div>`;
    loadCryptoWallets();
  } else if (_cyberTab === 'etherscan') {
    content.innerHTML = tabBar + renderEtherscanView();
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
  const body = document.getElementById('crypto-wallets-body');
  if (!body) return;

  if (window.cryptoWalletData) {
    const { results, cols } = window.cryptoWalletData;
    body.innerHTML = _cryptoTableHTML(results, cols, results.length);
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

function renderEtherscanView() {
  return `
    <div style="max-width:700px">
      <div style="margin-bottom:20px">
        <div style="font-size:15px;font-weight:700;color:var(--yellow);margin-bottom:4px">₿ Etherscan Lookup</div>
        <div style="font-size:12px;color:var(--muted)">Look up Ethereum addresses, transactions, and token transfers via the Etherscan API.</div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:24px">
        <div style="position:relative;flex:1">
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted)" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="etherscan-input" type="text" placeholder="Enter Ethereum address (0x…) or tx hash…"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px 10px 34px;font-size:13px;color:var(--text);outline:none;font-family:monospace"
            onkeydown="if(event.key==='Enter') etherscanLookup()">
        </div>
        <button onclick="etherscanLookup()"
          style="padding:10px 20px;background:var(--yellow);color:#000;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0">
          Look Up
        </button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap" id="etherscan-type-btns">
        ${['balance','txlist','tokentx'].map((m, i) => {
          const labels = { balance: 'ETH Balance', txlist: 'Transactions', tokentx: 'Token Transfers' };
          return `<button class="etherscan-type-btn" data-module="${m}"
            onclick="etherscanSetType('${m}')"
            style="padding:5px 14px;border-radius:20px;border:1px solid var(--border);background:${i===0?'var(--yellow)':'none'};color:${i===0?'#000':'var(--muted)'};font-size:12px;cursor:pointer">
            ${labels[m]}
          </button>`;
        }).join('')}
      </div>

      <div id="etherscan-results"></div>
    </div>`;
}

let _etherscanType = 'balance';
let _etherscanKey = null;

function etherscanSetType(type) {
  _etherscanType = type;
  document.querySelectorAll('.etherscan-type-btn').forEach(btn => {
    const active = btn.dataset.module === type;
    btn.style.background = active ? 'var(--yellow)' : 'none';
    btn.style.color = active ? '#000' : 'var(--muted)';
  });
}

async function etherscanLookup() {
  const address = document.getElementById('etherscan-input')?.value.trim();
  const resultsEl = document.getElementById('etherscan-results');
  if (!address || !resultsEl) return;

  resultsEl.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Querying Etherscan…</div></div>`;

  if (!_etherscanKey) {
    const kr = await fetch('/api/etherscan-key');
    const kd = await kr.json();
    _etherscanKey = kd.key || '';
  }

  const baseParams = { chainid: '1', module: 'account', action: _etherscanType, address, apikey: _etherscanKey };
  if (_etherscanType === 'balance') baseParams.tag = 'latest';
  else baseParams.sort = 'desc';
  const res = await fetch(`https://api.etherscan.io/v2/api?${new URLSearchParams(baseParams)}`);
  const data = await res.json();

  if (data.status === '0' && data.message !== 'No transactions found') {
    resultsEl.innerHTML = `<div class="empty"><div class="empty-icon">₿</div><div>${esc(data.message || 'No results')}</div><div style="font-size:11px;color:var(--muted);margin-top:6px;font-family:monospace">${esc(String(data.result || ''))}</div></div>`;
    return;
  }

  if (_etherscanType === 'balance') {
    const eth = parseFloat(data.result) / 1e18;
    const addrLower = address.toLowerCase();
    const apiBase = `https://api.etherscan.io/v2/api?${new URLSearchParams({chainid:'1', apikey:_etherscanKey})}`;
    const [priceRes, txRes] = await Promise.all([
      fetch(`${apiBase}&module=stats&action=ethprice`),
      fetch(`${apiBase}&module=account&action=txlist&address=${encodeURIComponent(address)}&sort=desc&offset=100`),
    ]);
    const priceData = await priceRes.json();
    const txDataRaw = await txRes.json();
    const ethPrice = parseFloat(priceData.result?.ethusd || 0);
    const usd = ethPrice ? (eth * ethPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';
    const rawTxs = Array.isArray(txDataRaw.result) ? txDataRaw.result : [];
    const fmt = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const COLOR = {
      incoming: { solid: 'rgba(39,174,96,1)',  fill: 'rgba(39,174,96,0.65)'  },
      outgoing: { solid: 'rgba(230,126,34,1)', fill: 'rgba(230,126,34,0.65)' },
      failed:   { solid: 'rgba(192,57,43,1)',  fill: 'rgba(192,57,43,0.55)'  },
      contract: { solid: 'rgba(241,196,15,1)', fill: 'rgba(241,196,15,0.65)' },
    };

    // Normalize Etherscan fields
    const txNorm = rawTxs.map(tx => ({
      hash:         tx.hash,
      timestamp:    parseInt(tx.timeStamp),
      value_eth:    parseFloat(tx.value) / 1e18,
      from_address: (tx.from || '').toLowerCase(),
      to_address:   (tx.to  || '').toLowerCase(),
      is_error:     tx.isError === '1',
      gas_fee_eth:  (parseInt(tx.gasUsed || 0) * parseInt(tx.gasPrice || 0)) / 1e18,
    }));

    // Compute senders list up front so we can use it in the HTML
    const _senders = {};
    txNorm.forEach(tx => {
      if (tx.is_error || tx.to_address !== addrLower || tx.from_address === addrLower || tx.value_eth === 0) return;
      if (!_senders[tx.from_address]) _senders[tx.from_address] = { usd: 0, eth: 0, txCount: 0 };
      _senders[tx.from_address].usd     += tx.value_eth * ethPrice;
      _senders[tx.from_address].eth     += tx.value_eth;
      _senders[tx.from_address].txCount += 1;
    });
    const senderList = Object.entries(_senders).sort((a, b) => b[1].usd - a[1].usd);

    const legend = `
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">
        <span style="display:inline-block;width:10px;height:10px;background:${COLOR.incoming.fill};border-radius:2px;vertical-align:middle"></span>&nbsp;Incoming&nbsp;&nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:${COLOR.outgoing.fill};border-radius:2px;vertical-align:middle"></span>&nbsp;Outgoing&nbsp;&nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:${COLOR.contract.fill};border-radius:2px;vertical-align:middle"></span>&nbsp;Contract Call&nbsp;&nbsp;
        <span style="display:inline-block;width:10px;height:10px;background:${COLOR.failed.fill};border-radius:2px;vertical-align:middle"></span>&nbsp;Failed
      </div>`;

    const panel = (title, subtitle, id, body, open = true) => `
      <details ${open ? 'open' : ''} style="margin-bottom:12px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        <summary style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface2);cursor:pointer;user-select:none;list-style:none;gap:8px">
          <div>
            <span style="font-size:13px;font-weight:600;color:var(--text)">${title}</span>
            ${subtitle ? `<span style="font-size:11px;color:var(--muted);margin-left:8px">${subtitle}</span>` : ''}
          </div>
          <span class="panel-chevron" style="font-size:12px;color:var(--muted);transition:transform .2s">▾</span>
        </summary>
        <div id="${id}" style="padding:16px">${body}</div>
      </details>`;

    const sendersRows = senderList.length
      ? senderList.map(([ addr, d ], i) => {
          const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
          return `<tr style="background:${bg}">
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:11px;font-family:monospace;word-break:break-all">${addr}</td>
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:11px;color:${COLOR.incoming.solid};font-weight:600">${fmt(d.usd)}</td>
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted)">${d.eth.toFixed(6)} ETH</td>
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:11px;text-align:center">${d.txCount}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--muted);font-size:12px">No incoming value transactions found</td></tr>`;

    const sendersTable = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            ${['Sender Address','Total USD Sent','Total ETH Sent','Tx Count'].map(h =>
              `<th style="padding:8px 12px;text-align:left;background:var(--surface2);color:var(--muted);font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border)">${h}</th>`
            ).join('')}
          </tr></thead>
          <tbody>${sendersRows}</tbody>
        </table>
      </div>`;

    // Sanctions tile — placeholder rendered immediately, filled async after page loads
    const sanctionsTile = `
      <div id="sanctions-tile" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
        <div style="font-size:12px;color:var(--muted)">Checking sanctions lists…</div>
      </div>`;

    resultsEl.innerHTML = `
      ${sanctionsTile}
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;display:flex;gap:32px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">ETH Balance</div>
          <div style="font-size:28px;font-weight:700;color:var(--yellow)">${eth.toFixed(6)} ETH</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">USD Value</div>
          <div style="font-size:28px;font-weight:700;color:var(--green)">${usd}</div>
        </div>
        <div style="align-self:flex-end">
          <div style="font-size:11px;color:var(--muted);font-family:monospace">${esc(address)}</div>
          ${ethPrice ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">ETH price: $${ethPrice.toLocaleString()}</div>` : ''}
        </div>
      </div>

      ${rawTxs.length ? `
        ${panel('Transaction Activity', `${rawTxs.length} most recent · ${legend}`, 'panel-activity',
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:6px">USD VALUE PER TRANSACTION</div>
              <canvas id="barChart" height="180"></canvas>
            </div>
            <div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:6px">CUMULATIVE USD FLOW</div>
              <canvas id="lineChart" height="180"></canvas>
            </div>
          </div>`
        )}

        ${panel('Transaction Timeline', '↑ incoming  ↓ outgoing', 'panel-timeline',
          `<canvas id="timelineChart" height="160"></canvas>`
        )}

        ${panel('Wallets That Sent Funds', `${senderList.length} unique sender${senderList.length !== 1 ? 's' : ''}`, 'panel-senders', sendersTable)}

        ${panel('Address Flow Network', `
          <span style="display:inline-block;width:10px;height:10px;background:#3498db;border-radius:50%;vertical-align:middle"></span>&nbsp;This address&nbsp;
          <span style="display:inline-block;width:10px;height:10px;background:${COLOR.incoming.solid};border-radius:50%;vertical-align:middle"></span>&nbsp;Incoming&nbsp;
          <span style="display:inline-block;width:10px;height:10px;background:${COLOR.outgoing.solid};border-radius:50%;vertical-align:middle"></span>&nbsp;Outgoing&nbsp;
          <span style="display:inline-block;width:10px;height:10px;background:${COLOR.contract.solid};border-radius:50%;vertical-align:middle"></span>&nbsp;Contract Call&nbsp;
          <span style="display:inline-block;width:10px;height:10px;background:${COLOR.failed.solid};border-radius:2px;vertical-align:middle"></span>&nbsp;Failed`,
          'panel-network',
          `<div id="eth-flow-chart" style="height:420px;border:1px solid var(--border);border-radius:6px;background:var(--surface2)"></div>`
        )}

        ${panel('Address Flow', 'Senders → Address → Recipients · arrow width = USD · hover for details', 'panel-flow',
          `<div style="overflow-x:auto"><svg id="flowColumns"></svg></div>`
        )}

        ${panel('Transaction History', `${txNorm.length} transactions`, 'panel-txhistory',
          `<div id="eth-tx-table"></div>`
        )}
      ` : ''}`;

    // Animate chevrons on open/close
    resultsEl.querySelectorAll('details').forEach(det => {
      const chev = det.querySelector('.panel-chevron');
      if (chev) chev.style.transform = det.open ? 'rotate(0deg)' : 'rotate(-90deg)';
      det.addEventListener('toggle', () => {
        if (chev) chev.style.transform = det.open ? 'rotate(0deg)' : 'rotate(-90deg)';
      });
    });

    if (rawTxs.length) {
      _loadChartJs(() => _drawEthCharts(addrLower, txNorm, ethPrice, COLOR, fmt));
      _drawFlowColumns('flowColumns', addrLower, txNorm, ethPrice, fmt, eth, usd);

      // Batch-check all counterparty addresses for sanctions hits, then render table
      const counterparties = [...new Set(txNorm.flatMap(tx => [tx.from_address, tx.to_address]).filter(Boolean))];
      fetch('/api/sanctions-check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: counterparties }),
      })
        .then(r => r.json())
        .then(({ hits }) => _drawTxTable('eth-tx-table', addrLower, txNorm, ethPrice, fmt, COLOR, hits || {}))
        .catch(() =>         _drawTxTable('eth-tx-table', addrLower, txNorm, ethPrice, fmt, COLOR, {}));
    }
    _loadVisNetwork(() => _drawEthNetworkGraph('eth-flow-chart', address, rawTxs));

    // Sanctions checks run async — don't block page render
    const DATASET_LABELS = {
      us_ofac_sdn:'OFAC SDN', us_ofac_cons:'OFAC Consolidated', un_sc_sanctions:'UN Security Council',
      eu_sanctions_map:'EU Sanctions Map', gb_hmt_sanctions:'UK HMT', gb_fcdo_sanctions:'UK FCDO',
      ch_seco_sanctions:'Switzerland SECO', us_fbi_lazarus_crypto:'FBI Lazarus Group',
      il_mod_crypto:'Israel MoD', ransomwhere:'Ransomwhere',
      ua_nsdc_sanctions:'Ukraine NSDC', ca_dfatd_sema_sanctions:'Canada SEMA',
    };

    // Address sanctions check + batch counterparty check run in parallel
    const counterparties = rawTxs.length
      ? [...new Set(rawTxs.flatMap(tx => [tx.from?.toLowerCase(), tx.to?.toLowerCase()]).filter(Boolean))]
      : [];

    Promise.all([
      fetch(`/api/sanctions-check?address=${encodeURIComponent(addrLower)}`).then(r => r.json()),
      counterparties.length
        ? fetch('/api/sanctions-check-batch', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({addresses: counterparties}) }).then(r => r.json())
        : Promise.resolve({hits:{}}),
    ]).then(([sanctionsData, batchData]) => {
      // Update sanctions tile
      const tile = document.getElementById('sanctions-tile');
      if (tile) {
        const sanctioned = sanctionsData.sanctioned;
        const sMatches   = sanctionsData.matches || [];
        if (sanctioned) {
          tile.style.cssText = 'background:#1a0a0a;border:2px solid #c0392b;border-radius:var(--radius);padding:18px 20px;margin-bottom:16px';
          tile.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span style="font-size:20px">⚠️</span>
              <div>
                <div style="font-size:15px;font-weight:700;color:#e74c3c">SANCTIONED ADDRESS</div>
                <div style="font-size:11px;color:#c0392b;margin-top:1px">This address appears on ${sMatches.length} sanctions list${sMatches.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${sMatches.map(m => `
                <div style="background:rgba(192,57,43,0.12);border:1px solid rgba(192,57,43,0.3);border-radius:6px;padding:10px 14px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">
                  <div style="min-width:140px">
                    <div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">List</div>
                    <div style="font-size:13px;font-weight:600;color:#e74c3c">${esc(DATASET_LABELS[m.dataset] || m.dataset)}</div>
                  </div>
                  ${m.holder ? `<div style="min-width:160px"><div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Holder</div><div style="font-size:12px;color:#e2e8f0">${esc(m.holder)}</div></div>` : ''}
                  ${m.currency ? `<div><div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Currency</div><div style="font-size:12px;color:#e2e8f0">${esc(m.currency)}</div></div>` : ''}
                  ${m.sanction_program ? `<div style="min-width:160px"><div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Program</div><div style="font-size:12px;color:#e2e8f0">${esc(m.sanction_program)}</div></div>` : ''}
                  ${m.sanction_reason ? `<div style="flex:1;min-width:200px"><div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Reason</div><div style="font-size:11px;color:#e2e8f0">${esc(m.sanction_reason)}</div></div>` : ''}
                  ${m.first_seen ? `<div><div style="font-size:10px;color:#c0392b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">First Seen</div><div style="font-size:12px;color:#e2e8f0">${esc(m.first_seen)}</div></div>` : ''}
                </div>`).join('')}
            </div>`;
        } else {
          tile.style.cssText = 'background:#0a1a0f;border:1px solid #27ae60;border-radius:var(--radius);padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:10px';
          tile.innerHTML = `<span style="font-size:18px">✅</span><div><div style="font-size:13px;font-weight:600;color:#2ecc71">Not found on sanctions lists</div><div style="font-size:11px;color:var(--muted);margin-top:1px">Checked against 12 lists including OFAC SDN, UN, EU, UK, and more</div></div>`;
        }
      }

      // Update transaction table with sanctions highlights
      const hits = batchData.hits || {};
      if (rawTxs.length && Object.keys(hits).length) {
        _drawTxTable('eth-tx-table', addrLower, txNorm, ethPrice, fmt, COLOR, hits);
      }
    }).catch(() => {
      const tile = document.getElementById('sanctions-tile');
      if (tile) {
        tile.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:10px';
        tile.innerHTML = `<span style="font-size:16px">⚠</span><div style="font-size:12px;color:var(--muted)">Sanctions check unavailable</div>`;
      }
    });

    return;
  }

  const rows = Array.isArray(data.result) ? data.result : [];
  if (!rows.length) {
    resultsEl.innerHTML = `<div class="empty"><div class="empty-icon">₿</div><div>No records found</div></div>`;
    return;
  }

  const cols = _etherscanType === 'tokentx'
    ? ['hash', 'tokenName', 'tokenSymbol', 'value', 'from', 'to', 'timeStamp']
    : ['hash', 'value', 'from', 'to', 'isError', 'timeStamp'];

  const thead = `<thead><tr>${cols.map(c => `<th style="padding:8px 12px;text-align:left;background:var(--surface2);color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap">${c}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.slice(0, 100).map((r, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    const cells = cols.map(c => {
      let val = r[c] || '';
      if (c === 'value') val = (parseFloat(val) / 1e18).toFixed(6) + (_etherscanType === 'tokentx' ? ' ' + (r.tokenSymbol || '') : ' ETH');
      if (c === 'timeStamp') val = new Date(parseInt(val) * 1000).toISOString().slice(0, 10);
      if (c === 'hash' || c === 'from' || c === 'to') val = val.slice(0, 18) + '…';
      if (c === 'isError') val = val === '1' ? '❌ Error' : '✓';
      return `<td style="padding:7px 12px;border-bottom:1px solid var(--border);font-size:11px;font-family:monospace;white-space:nowrap">${esc(String(val))}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('')}</tbody>`;

  resultsEl.innerHTML = `
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${rows.length.toLocaleString()} records (showing first 100)</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">${thead}${tbody}</table></div>`;
}

function _loadChartJs(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
  s.onload = () => {
    // date-fns adapter needed for the timeline x-axis
    const s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js';
    s2.onload = cb;
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
}

function _drawEthCharts(addrLower, txNorm, ethPrice, COLOR, fmt) {
  const isCC = tx => tx.value_eth === 0 && !tx.is_error && tx.from_address === addrLower;
  const fillOf = tx => {
    if (tx.is_error) return COLOR.failed.fill;
    if (isCC(tx))    return COLOR.contract.fill;
    return tx.from_address === addrLower ? COLOR.outgoing.fill : COLOR.incoming.fill;
  };

  const ordered = [...txNorm].reverse();
  const labels    = ordered.map(tx => new Date(tx.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const usdValues = ordered.map(tx => parseFloat((tx.value_eth * ethPrice).toFixed(2)));
  const barColors = ordered.map(tx => fillOf(tx));

  let running = 0;
  const cumulative = ordered.map(tx => {
    if (!tx.is_error) {
      const usd = tx.value_eth * ethPrice;
      running += tx.from_address === addrLower ? -usd : usd;
    }
    return parseFloat(running.toFixed(2));
  });

  const scaleOpts = (yLabel) => ({
    y: { ticks: { callback: v => '$' + v.toLocaleString(), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' }, title: yLabel ? { display: true, text: yLabel, font: { size: 10 } } : undefined },
    x: { ticks: { font: { size: 9 }, maxRotation: 45 }, grid: { color: 'rgba(128,128,128,0.1)' } },
  });

  const barEl  = document.getElementById('barChart');
  const lineEl = document.getElementById('lineChart');
  const tlEl   = document.getElementById('timelineChart');
  if (!barEl || !lineEl || !tlEl) return;

  new Chart(barEl, {
    type: 'bar',
    data: { labels, datasets: [{ data: usdValues, backgroundColor: barColors, borderRadius: 3 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }, scales: scaleOpts() },
  });

  new Chart(lineEl, {
    type: 'line',
    data: { labels, datasets: [{ data: cumulative, borderColor: COLOR.incoming.solid, backgroundColor: 'rgba(39,174,96,0.1)', pointBackgroundColor: ordered.map(tx => fillOf(tx)), fill: true, tension: 0.3, pointRadius: 3 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } }, scales: scaleOpts() },
  });

  // Timeline bubble — outgoing plotted as negative y so direction is visible
  const buckets = { incoming: [], outgoing: [], contract: [], failed: [] };
  txNorm.forEach(tx => {
    const absUsd = parseFloat((tx.value_eth * ethPrice).toFixed(2));
    const isOut  = tx.from_address === addrLower;
    const p = { x: new Date(tx.timestamp * 1000), y: isOut ? -absUsd : absUsd, absUsd, hash: tx.hash, from: tx.from_address, to: tx.to_address };
    if (tx.is_error)   buckets.failed.push(p);
    else if (isCC(tx)) buckets.contract.push(p);
    else if (isOut)    buckets.outgoing.push(p);
    else               buckets.incoming.push(p);
  });

  const r = p => Math.max(4, Math.min(18, Math.sqrt((Math.abs(p.y) || 1) / 10) + 4));
  const tlTip = ctx => {
    const p = ctx.raw;
    const dir = p.y < 0 ? 'Sent' : 'Received';
    return [`${dir}: ${fmt(Math.abs(p.y))}`, `From: ${p.from.slice(0,10)}…`, `To: ${p.to ? p.to.slice(0,10) + '…' : '—'}`, `Tx: ${p.hash.slice(0,12)}…`];
  };

  new Chart(tlEl, {
    type: 'bubble',
    data: {
      datasets: [
        { label: 'Incoming', data: buckets.incoming.map(p => ({ ...p, r: r(p) })), backgroundColor: COLOR.incoming.fill, borderColor: COLOR.incoming.solid },
        { label: 'Outgoing', data: buckets.outgoing.map(p => ({ ...p, r: r(p) })), backgroundColor: COLOR.outgoing.fill, borderColor: COLOR.outgoing.solid },
        { label: 'Contract', data: buckets.contract.map(p => ({ ...p, r: 5 })), backgroundColor: COLOR.contract.fill, borderColor: COLOR.contract.solid },
        { label: 'Failed',   data: buckets.failed.map(p => ({ ...p, r: 5 })), backgroundColor: COLOR.failed.fill, borderColor: COLOR.failed.solid },
      ],
    },
    options: {
      plugins: {
        legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: { callbacks: { label: tlTip } },
      },
      scales: {
        x: { type: 'time', time: { tooltipFormat: 'MMM d, yyyy HH:mm', displayFormats: { day: 'MMM d', hour: 'MMM d HH:mm' } }, title: { display: true, text: 'Date', font: { size: 10 } }, ticks: { font: { size: 9 } } },
        y: {
          title: { display: true, text: '↑ Incoming (USD)   ↓ Outgoing (USD)', font: { size: 10 } },
          ticks: { callback: v => '$' + Math.abs(v).toLocaleString(), font: { size: 10 } },
          grid: { color: ctx => ctx.tick.value === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(128,128,128,0.1)', lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1 },
        },
      },
    },
  });
}

function _drawFlowColumns(svgId, addrLower, txNorm, ethPrice, fmt, ethBalance, usdBalance) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const senders   = {};
  const receivers = {};
  txNorm.forEach(tx => {
    if (tx.is_error) return;
    const usd = tx.value_eth * ethPrice;
    if (tx.to_address === addrLower && tx.from_address !== addrLower) {
      if (!senders[tx.from_address]) senders[tx.from_address] = { usd: 0, txCount: 0 };
      senders[tx.from_address].usd += usd; senders[tx.from_address].txCount++;
    }
    if (tx.from_address === addrLower && tx.to_address && tx.to_address !== addrLower) {
      if (!receivers[tx.to_address]) receivers[tx.to_address] = { usd: 0, txCount: 0 };
      receivers[tx.to_address].usd += usd; receivers[tx.to_address].txCount++;
    }
  });

  const senderList   = Object.entries(senders).sort((a, b) => b[1].usd - a[1].usd);
  const receiverList = Object.entries(receivers).sort((a, b) => b[1].usd - a[1].usd);

  const NODE_W = 240, NODE_H = 66, NODE_GAP = 16, COL_GAP = 210, PAD = 36;
  const colH = n => PAD * 2 + n * (NODE_H + NODE_GAP) - NODE_GAP;
  const svgH = Math.max(colH(Math.max(senderList.length, 1)), colH(Math.max(receiverList.length, 1)), NODE_H + PAD * 2);
  const svgW = NODE_W * 3 + COL_GAP * 2 + PAD * 2;
  const col  = { left: PAD, center: PAD + NODE_W + COL_GAP, right: PAD + NODE_W * 2 + COL_GAP * 2 };

  function nodeY(idx, total) {
    const blockH = total * (NODE_H + NODE_GAP) - NODE_GAP;
    return (svgH - blockH) / 2 + idx * (NODE_H + NODE_GAP);
  }

  const NS = 'http://www.w3.org/2000/svg';
  svg.setAttribute('width', svgW); svg.setAttribute('height', svgH); svg.setAttribute('style', 'display:block');

  const tip = document.createElement('div');
  Object.assign(tip.style, { position: 'fixed', background: 'rgba(0,0,0,0.82)', color: '#fff', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', pointerEvents: 'none', display: 'none', lineHeight: '1.6', zIndex: '9999', maxWidth: '320px', wordBreak: 'break-all' });
  document.body.appendChild(tip);
  const withTip = (elem, html) => {
    elem.style.cursor = 'default';
    elem.addEventListener('mouseenter', () => { tip.innerHTML = html; tip.style.display = 'block'; });
    elem.addEventListener('mousemove',  e => { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; });
    elem.addEventListener('mouseleave', () => tip.style.display = 'none');
  };

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (parent) parent.appendChild(e);
    return e;
  };

  const drawNode = (x, y, addr, fill, textColor, usdLabel) => {
    const g = el('g', {}, svg);
    el('rect', { x, y, width: NODE_W, height: NODE_H, rx: 5, fill }, g);
    const midY = y + NODE_H / 2;
    // address split across two lines, shifted up when USD label is present
    const addrTop = usdLabel ? midY - 16 : midY - 7;
    el('text', { x: x + NODE_W / 2, y: addrTop,      'text-anchor': 'middle', 'font-size': '10', fill: textColor, 'font-family': 'monospace' }, g).textContent = addr.slice(0, 20);
    el('text', { x: x + NODE_W / 2, y: addrTop + 13, 'text-anchor': 'middle', 'font-size': '10', fill: textColor, 'font-family': 'monospace' }, g).textContent = addr.slice(20);
    if (usdLabel) {
      el('text', { x: x + NODE_W / 2, y: midY + 17, 'text-anchor': 'middle', 'font-size': '11', 'font-weight': 'bold', fill: '#f6c90e' }, g).textContent = usdLabel;
    }
    withTip(g, `<strong>${addr}</strong>${usdLabel ? `<br><span style="color:#f6c90e">${usdLabel}</span>` : ''}`);
  };

  const allUsd = [...senderList, ...receiverList].map(([, v]) => v.usd);
  const maxUsd = Math.max(...allUsd, 1);

  const drawArrow = (x1, y1, x2, y2, usd, color, tipHtml) => {
    const w = Math.max(1.5, Math.min(16, (usd / maxUsd) * 16));
    const mx = (x1 + x2) / 2;
    const path = el('path', { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, fill: 'none', stroke: color, 'stroke-width': w.toFixed(1), 'stroke-opacity': '0.55' }, svg);
    withTip(path, tipHtml);
    el('circle', { cx: x2, cy: y2, r: Math.max(3, w / 2), fill: color, opacity: '0.8' }, svg);
  };

  const cy = (svgH - NODE_H) / 2;
  const centerLabel = ethBalance != null ? `${ethBalance.toFixed(4)} ETH · ${usdBalance}` : null;
  drawNode(col.center, cy, addrLower, '#2980b9', '#fff', centerLabel);
  const cmY = cy + NODE_H / 2;

  senderList.forEach(([addr, d], i) => {
    const y = nodeY(i, senderList.length), mid = y + NODE_H / 2;
    drawNode(col.left, y, addr, 'rgba(39,174,96,0.15)', '#1a5c38', fmt(d.usd));
    drawArrow(col.left + NODE_W, mid, col.center, cmY, d.usd, 'rgba(39,174,96,1)', `<strong>${addr}</strong><br>Sent: ${fmt(d.usd)}<br>${d.txCount} tx`);
  });
  if (!senderList.length) el('text', { x: col.left + NODE_W / 2, y: svgH / 2, 'text-anchor': 'middle', 'font-size': '13', fill: '#aaa' }, svg).textContent = 'No incoming';

  receiverList.forEach(([addr, d], i) => {
    const y = nodeY(i, receiverList.length), mid = y + NODE_H / 2;
    drawNode(col.right, y, addr, 'rgba(230,126,34,0.15)', '#7d4a00', fmt(d.usd));
    drawArrow(col.center + NODE_W, cmY, col.right, mid, d.usd, 'rgba(230,126,34,1)', `<strong>${addr}</strong><br>Received: ${fmt(d.usd)}<br>${d.txCount} tx`);
  });
  if (!receiverList.length) el('text', { x: col.right + NODE_W / 2, y: svgH / 2, 'text-anchor': 'middle', 'font-size': '13', fill: '#aaa' }, svg).textContent = 'No outgoing';

  [
    [col.left   + NODE_W / 2, 'Senders',          '#27ae60'],
    [col.center + NODE_W / 2, 'Searched Address',  '#2980b9'],
    [col.right  + NODE_W / 2, 'Recipients',        '#e67e22'],
  ].forEach(([x, label, color]) => el('text', { x, y: 20, 'text-anchor': 'middle', 'font-size': '13', 'font-weight': 'bold', fill: color }, svg).textContent = label);
}

function _drawTxTable(containerId, addrLower, txNorm, ethPrice, fmt, COLOR, sanctionHits = {}) {
  const container = document.getElementById(containerId);
  if (!container || !txNorm.length) return;

  const isCC = tx => tx.value_eth === 0 && !tx.is_error && tx.from_address === addrLower;

  const DATASET_LABELS = {
    us_ofac_sdn: 'OFAC SDN', us_ofac_cons: 'OFAC Cons.', un_sc_sanctions: 'UN SC',
    eu_sanctions_map: 'EU', gb_hmt_sanctions: 'UK HMT', gb_fcdo_sanctions: 'UK FCDO',
    ch_seco_sanctions: 'SECO', us_fbi_lazarus_crypto: 'FBI Lazarus', il_mod_crypto: 'IL MoD',
    ransomwhere: 'Ransomwhere', ua_nsdc_sanctions: 'UA NSDC', ca_dfatd_sema_sanctions: 'CA SEMA',
  };

  const sanctionBadge = addr => {
    const hit = sanctionHits[addr];
    if (!hit) return '';
    const labels = hit.datasets.map(d => DATASET_LABELS[d] || d).join(', ');
    return ` <span title="Sanctioned: ${labels}${hit.holder ? ' · ' + hit.holder : ''}"
      style="display:inline-block;background:#c0392b;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;vertical-align:middle;margin-left:4px;white-space:nowrap">
      ⚠ ${labels}
    </span>`;
  };

  const typeLabel = tx => {
    if (tx.is_error)                   return `<span style="color:${COLOR.failed.solid};font-weight:600">Failed</span>`;
    if (isCC(tx))                      return `<span style="color:${COLOR.contract.solid};font-weight:600">Contract Call</span>`;
    if (tx.from_address === addrLower) return `<span style="color:${COLOR.outgoing.solid};font-weight:600">Outgoing</span>`;
    return `<span style="color:${COLOR.incoming.solid};font-weight:600">Incoming</span>`;
  };

  const sanctionedCount = txNorm.filter(tx =>
    sanctionHits[tx.from_address] || sanctionHits[tx.to_address]
  ).length;

  const rows = txNorm.map((tx, i) => {
    const fromHit    = !!sanctionHits[tx.from_address];
    const toHit      = !!sanctionHits[tx.to_address];
    const rowFlagged = fromHit || toHit;
    const bg = rowFlagged
      ? 'rgba(192,57,43,0.13)'
      : (i % 2 === 0 ? 'var(--bg)' : 'var(--surface)');
    const border = rowFlagged ? '1px solid rgba(192,57,43,0.35)' : '1px solid var(--border)';
    const date   = new Date(tx.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const usdVal = ethPrice ? fmt(tx.value_eth * ethPrice) : `${tx.value_eth.toFixed(6)} ETH`;
    const valColor = tx.from_address === addrLower && tx.value_eth > 0 ? COLOR.outgoing.solid : COLOR.incoming.solid;
    const gasFeeStr = tx.gas_fee_eth > 0
      ? (ethPrice ? fmt(tx.gas_fee_eth * ethPrice) : `${tx.gas_fee_eth.toFixed(6)} ETH`)
      : '<span style="color:var(--muted)">—</span>';
    const td = `padding:6px 10px;border-bottom:${border};font-size:11px`;
    return `<tr style="background:${bg}${rowFlagged ? ';outline:1px solid rgba(192,57,43,0.25)' : ''}">
      <td style="${td}">${typeLabel(tx)}${rowFlagged ? ' <span style="color:#e74c3c;font-size:10px">⚠</span>' : ''}</td>
      <td style="${td};font-family:monospace">
        <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" style="color:var(--accent)">${tx.hash.slice(0,14)}…</a>
      </td>
      <td style="${td};font-size:10px;font-family:monospace;word-break:break-all;max-width:150px">
        ${tx.from_address}${sanctionBadge(tx.from_address)}
      </td>
      <td style="${td};font-size:10px;font-family:monospace;word-break:break-all;max-width:150px">
        ${tx.to_address || '—'}${tx.to_address ? sanctionBadge(tx.to_address) : ''}
      </td>
      <td style="${td};color:${valColor}">${usdVal}</td>
      <td style="${td};color:var(--muted)">${gasFeeStr}</td>
      <td style="${td};white-space:nowrap">${date}</td>
      <td style="${td}">${tx.is_error ? `<span style="color:${COLOR.failed.solid}">Failed</span>` : '<span style="color:var(--green)">OK</span>'}</td>
    </tr>`;
  }).join('');

  const sanctionNote = sanctionedCount
    ? `<div style="font-size:11px;color:#e74c3c;margin-bottom:8px">
        ⚠ <strong>${sanctionedCount}</strong> transaction${sanctionedCount !== 1 ? 's' : ''} involve a sanctioned address
       </div>`
    : '';

  const thead = `<thead><tr>${['Type','Tx Hash','From','To','Value','Gas Fee','Date','Status'].map(h =>
    `<th style="padding:8px 10px;text-align:left;background:var(--surface2);color:var(--muted);font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border)">${h}</th>`
  ).join('')}</tr></thead>`;

  container.innerHTML = sanctionNote + `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">${thead}<tbody>${rows}</tbody></table></div>`;
}

function _loadVisNetwork(cb) {
  if (window.vis) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/vis-network@9/dist/vis-network.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

function _drawEthNetworkGraph(containerId, address, txs) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!txs.length) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px">No transactions found for this address.</div>`;
    return;
  }

  const addrLower = address.toLowerCase();

  const COLOR = {
    incoming: { solid: 'rgba(39,174,96,1)',  fill: 'rgba(39,174,96,0.8)'  },
    outgoing: { solid: 'rgba(230,126,34,1)', fill: 'rgba(230,126,34,0.8)' },
    failed:   { solid: 'rgba(192,57,43,1)',  fill: 'rgba(192,57,43,0.7)'  },
    contract: { solid: 'rgba(241,196,15,1)', fill: 'rgba(241,196,15,0.8)' },
  };

  const isContractCall = tx =>
    parseFloat(tx.value) === 0 && tx.isError !== '1' && tx.from?.toLowerCase() === addrLower;

  function txColor(tx) {
    if (tx.isError === '1')      return COLOR.failed;
    if (isContractCall(tx))      return COLOR.contract;
    return tx.from?.toLowerCase() === addrLower ? COLOR.outgoing : COLOR.incoming;
  }

  const nodesMap = new Map();
  const edges = [];

  // Center node
  nodesMap.set(addrLower, {
    id: addrLower,
    label: addrLower.slice(0,6) + '…' + addrLower.slice(-4),
    title: address,
    color: { background: '#3498db', border: '#2471a3', highlight: { background: '#5dade2', border: '#2471a3' } },
    shape: 'dot', size: 22, font: { color: '#e2e8f0', size: 11 }
  });

  txs.slice(0, 100).forEach(tx => {
    const from = tx.from?.toLowerCase();
    const to   = tx.to?.toLowerCase();
    if (!from || !to) return;
    const val = parseFloat(tx.value) / 1e18;
    const c = txColor(tx);
    const counterparty = from === addrLower ? to : from;

    if (!nodesMap.has(counterparty)) {
      nodesMap.set(counterparty, {
        id: counterparty,
        label: counterparty.slice(0,6) + '…' + counterparty.slice(-4),
        title: counterparty,
        color: { background: c.fill, border: c.solid, highlight: { background: c.fill, border: c.solid } },
        shape: 'dot', size: 12, font: { color: '#e2e8f0', size: 10 }
      });
    }

    edges.push({
      from, to,
      arrows: 'to',
      color: { color: c.solid, opacity: 0.7 },
      title: `${val.toFixed(6)} ETH${tx.isError === '1' ? ' (FAILED)' : ''}`,
      width: Math.max(1, Math.min(6, val * 2)),
      smooth: { type: 'curvedCW', roundness: 0.2 },
    });
  });

  const data = {
    nodes: new vis.DataSet([...nodesMap.values()]),
    edges: new vis.DataSet(edges),
  };

  new vis.Network(container, data, {
    physics: {
      stabilization: { iterations: 150 },
      barnesHut: { gravitationalConstant: -8000, springLength: 140 },
    },
    interaction: { hover: true, tooltipDelay: 100 },
    nodes: { borderWidth: 1.5 },
    edges: { arrows: { to: { scaleFactor: 0.6 } } },
  });
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
