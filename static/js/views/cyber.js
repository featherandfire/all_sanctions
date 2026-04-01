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
    const apiBase = `https://api.etherscan.io/v2/api?${new URLSearchParams({chainid:'1', apikey:_etherscanKey})}`;
    const [priceRes, txRes] = await Promise.all([
      fetch(`${apiBase}&module=stats&action=ethprice`),
      fetch(`${apiBase}&module=account&action=txlist&address=${encodeURIComponent(address)}&sort=desc`)
    ]);
    const priceData = await priceRes.json();
    const txData = await txRes.json();
    const ethPrice = parseFloat(priceData.result?.ethusd || 0);
    const usd = ethPrice ? (eth * ethPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—';

    resultsEl.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:24px;display:flex;gap:32px;flex-wrap:wrap">
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
      <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Transaction Flow</div>
      <div id="eth-flow-chart"></div>`;

    const txs = Array.isArray(txData.result) ? txData.result : [];
    _drawEthFlowChart('eth-flow-chart', address, txs);
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

function _drawEthFlowChart(containerId, address, txs) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const addrLower = address.toLowerCase();
  const senderMap = {}, receiverMap = {};

  txs.forEach(tx => {
    const val = parseFloat(tx.value) / 1e18;
    if (val <= 0 || tx.isError === '1') return;
    if (tx.to?.toLowerCase() === addrLower) {
      senderMap[tx.from] = (senderMap[tx.from] || 0) + val;
    } else if (tx.from?.toLowerCase() === addrLower) {
      receiverMap[tx.to] = (receiverMap[tx.to] || 0) + val;
    }
  });

  const topSenders   = Object.entries(senderMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const topReceivers = Object.entries(receiverMap).sort((a,b) => b[1]-a[1]).slice(0, 8);

  if (!topSenders.length && !topReceivers.length) {
    container.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:12px 0">No transaction flow data found.</div>`;
    return;
  }

  const totalW  = container.clientWidth || 800;
  const colW    = 180;
  const boxH    = 44;
  const boxGap  = 10;
  const nRows   = Math.max(topSenders.length, topReceivers.length, 1);
  const totalH  = nRows * (boxH + boxGap) + 60;
  const centerX = (totalW - colW) / 2;
  const centerY = totalH / 2 - boxH / 2;

  const _colPositions = (n) => {
    const total = n * (boxH + boxGap) - boxGap;
    const start = (totalH - total) / 2;
    return Array.from({length: n}, (_, i) => start + i * (boxH + boxGap));
  };

  const leftYs  = _colPositions(topSenders.length);
  const rightYs = _colPositions(topReceivers.length);
  const maxVal  = Math.max(...topSenders.map(([,v])=>v), ...topReceivers.map(([,v])=>v), 0.001);

  const svg = d3.select(`#${containerId}`).append('svg')
    .attr('width', totalW).attr('height', totalH);

  // Ribbons: senders → center
  topSenders.forEach(([, val], i) => {
    const sw = Math.max(1.5, (val / maxVal) * 14);
    const x1 = colW, y1 = leftYs[i] + boxH / 2;
    const x2 = centerX, y2 = centerY + boxH / 2;
    const mx = (x1 + x2) / 2;
    svg.append('path')
      .attr('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)
      .attr('fill', 'none').attr('stroke', '#4f8ef7')
      .attr('stroke-width', sw).attr('opacity', 0.35);
  });

  // Ribbons: center → receivers
  topReceivers.forEach(([, val], i) => {
    const sw = Math.max(1.5, (val / maxVal) * 14);
    const x1 = centerX + colW, y1 = centerY + boxH / 2;
    const x2 = totalW - colW, y2 = rightYs[i] + boxH / 2;
    const mx = (x1 + x2) / 2;
    svg.append('path')
      .attr('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`)
      .attr('fill', 'none').attr('stroke', '#3ecf8e')
      .attr('stroke-width', sw).attr('opacity', 0.35);
  });

  const g = svg.append('g');

  function drawBox(x, y, topLine, bottomLine, color) {
    g.append('rect').attr('x', x).attr('y', y).attr('width', colW).attr('height', boxH)
      .attr('fill', color + '15').attr('stroke', color).attr('stroke-width', 1).attr('rx', 5);
    g.append('text').attr('x', x + colW/2).attr('y', y + 16).attr('text-anchor', 'middle')
      .style('font-size', '10px').style('fill', color).style('font-weight', '600')
      .text(topLine);
    g.append('text').attr('x', x + colW/2).attr('y', y + 31).attr('text-anchor', 'middle')
      .style('font-size', '9px').style('fill', '#64748b').style('font-family', 'monospace')
      .text(bottomLine);
  }

  // Column headers
  const headerY = 6;
  ['Senders', 'Queried Address', 'Recipients'].forEach((label, i) => {
    const x = i === 0 ? 0 : i === 1 ? centerX : totalW - colW;
    g.append('text').attr('x', x + colW/2).attr('y', headerY + 10).attr('text-anchor', 'middle')
      .style('font-size', '10px').style('fill', '#64748b').style('font-weight', '600')
      .style('text-transform', 'uppercase').style('letter-spacing', '0.5px').text(label);
  });

  topSenders.forEach(([addr, val], i) => {
    drawBox(0, leftYs[i], addr.slice(0,10)+'…'+addr.slice(-6), val.toFixed(4)+' ETH in', '#4f8ef7');
  });
  drawBox(centerX, centerY, address.slice(0,10)+'…'+address.slice(-6), 'queried address', '#f6c90e');
  topReceivers.forEach(([addr, val], i) => {
    drawBox(totalW - colW, rightYs[i], addr.slice(0,10)+'…'+addr.slice(-6), val.toFixed(4)+' ETH out', '#3ecf8e');
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
