let _medicaidTab = 'datasets';
let _medicaidStateFilter = null;
let _selectedMedicaidState = 'all';
let _medFilterTimer = null;

async function renderMedicaidView(tab) {
  if (tab) _medicaidTab = tab;
  const content = document.getElementById('content');
  const medDatasets = allDatasets.filter(d => (d.tags || []).includes('sector.usmed.debarment'));
  const totalEntities = medDatasets.reduce((s, d) => s + (d.entity_count || 0), 0);
  const totalTargets  = medDatasets.reduce((s, d) => s + (d.target_count || 0), 0);

  // Group by state
  const byState = {};
  for (const ds of medDatasets) {
    const m = ds.name.match(/^us_([a-z]{2})_/);
    const state = m ? (US_STATE_NAMES[m[1]] || m[1].toUpperCase()) : 'Federal';
    if (!byState[state]) byState[state] = [];
    byState[state].push(ds);
  }
  const stateList = Object.entries(byState).sort((a, b) =>
    b[1].reduce((s, d) => s + (d.entity_count||0), 0) - a[1].reduce((s, d) => s + (d.entity_count||0), 0)
  );

  const tabBar = `
    <div style="display:flex;gap:2px;margin-bottom:20px;border-bottom:1px solid var(--border)">
      <button onclick="renderMedicaidView('datasets')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_medicaidTab==='datasets'?'var(--accent)':'transparent'};background:none;color:${_medicaidTab==='datasets'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_medicaidTab==='datasets'?'600':'400'}">Datasets</button>
      <button onclick="renderMedicaidView('records')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_medicaidTab==='records'?'var(--accent)':'transparent'};background:none;color:${_medicaidTab==='records'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_medicaidTab==='records'?'600':'400'}">Records</button>
    </div>`;

  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-label">Datasets</div><div class="stat-value accent">${medDatasets.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Excluded</div><div class="stat-value red">${totalEntities.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Targets</div><div class="stat-value">${totalTargets.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">States</div><div class="stat-value">${stateList.length}</div></div>
    </div>`;

  if (_medicaidTab === 'datasets') {
    // Ensure selected state is valid
    if (_selectedMedicaidState !== 'all' && !byState[_selectedMedicaidState]) {
      _selectedMedicaidState = 'all';
    }

    content.innerHTML = tabBar + statStrip + `
      <div style="display:flex;gap:0;height:calc(100vh - 200px);margin:0 -24px -24px;border-top:1px solid var(--border);overflow:hidden">

        <!-- State list (left panel) -->
        <div style="width:240px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface)">
          <div style="padding:10px 12px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:1">
            <div style="position:relative">
              <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="med-state-search" type="text" placeholder="Filter states…" oninput="filterMedicaidStates(this.value)"
                style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px 6px 28px;font-size:12px;color:var(--text);outline:none">
            </div>
          </div>
          <div id="med-state-list">
            ${renderMedicaidStateRows(stateList, medDatasets)}
          </div>
        </div>

        <!-- Dataset panel (right) -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px" id="med-datasets-panel">
          ${renderMedicaidStateDatasets(_selectedMedicaidState, byState, medDatasets)}
        </div>
      </div>`;

  } else {
    content.innerHTML = tabBar + statStrip + `<div id="med-records-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading Medicaid exclusion records…</div></div></div>`;
    await loadMedicaidPage(0);
  }
}

function renderMedicaidStateRows(stateList, medDatasets) {
  const allActive = _selectedMedicaidState === 'all';
  const allRow = `<div class="country-row" data-state="all" onclick="selectMedicaidState('all')"
    style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
      background:${allActive ? 'var(--surface2)' : 'transparent'};
      border-left:3px solid ${allActive ? 'var(--accent)' : 'transparent'};transition:all .12s">
    <span style="font-size:18px;line-height:1;flex-shrink:0">🇺🇸</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;color:${allActive ? 'var(--text)' : 'var(--muted)'};font-weight:${allActive ? '600' : '400'}">All States</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${medDatasets.length} dataset${medDatasets.length !== 1 ? 's' : ''}</div>
    </div>
  </div>`;

  const rows = stateList.map(([state, dsList]) => {
    const active = _selectedMedicaidState === state;
    const n = dsList.reduce((s, d) => s + (d.entity_count || 0), 0);
    const color = STATE_COLOR_MAP[state] || '#94a3b8';
    return `<div class="country-row" data-state="${esc(state)}" onclick="selectMedicaidState('${esc(state)}')"
      style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
        background:${active ? 'var(--surface2)' : 'transparent'};
        border-left:3px solid ${active ? 'var(--accent)' : 'transparent'};transition:all .12s">
      <span style="width:12px;height:12px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:${active ? 'var(--text)' : 'var(--muted)'};font-weight:${active ? '600' : '400'};
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(state)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">
          ${dsList.length} dataset${dsList.length !== 1 ? 's' : ''} · ${fmtNum(n)} excluded
        </div>
      </div>
    </div>`;
  }).join('');

  return allRow + rows;
}

function renderMedicaidStateDatasets(state, byState, medDatasets) {
  const dsList = state === 'all' ? medDatasets : (byState[state] || []);
  const sorted = [...dsList].sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0));
  const totalEntities = dsList.reduce((s, d) => s + (d.entity_count || 0), 0);
  const color = state !== 'all' ? (STATE_COLOR_MAP[state] || '#94a3b8') : null;

  const header = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">
      ${color
        ? `<span style="width:20px;height:20px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block"></span>`
        : `<span style="font-size:24px">🇺🇸</span>`}
      <div>
        <div style="font-size:18px;font-weight:700">${state === 'all' ? 'All States' : esc(state)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">
          ${dsList.length} dataset${dsList.length !== 1 ? 's' : ''} · ${fmtNum(totalEntities)} excluded providers
        </div>
      </div>
    </div>`;

  const cards = sorted.map(ds => {
    const m = ds.name.match(/^us_([a-z]{2})_/);
    const dsState = m ? (US_STATE_NAMES[m[1]] || m[1].toUpperCase()) : 'Federal';
    const statusColor = ds.result === 'success' ? 'var(--green)' : ds.result ? 'var(--red)' : 'var(--muted)';
    const tags = (ds.tags || []).slice(0, 3).map(t =>
      `<span style="padding:2px 7px;background:var(--tag-bg);color:var(--tag-text);border-radius:10px;font-size:10px">${t}</span>`
    ).join(' ');
    return `<div class="dataset-card" style="margin-bottom:10px" onclick="showDetail('${ds.name}')">
      <div class="card-header">
        <div style="flex:1">
          <div class="card-title">${esc(ds.title)}</div>
          <div class="card-name">${esc(ds.name)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:10px;color:${statusColor}">${ds.result || '—'}</span>
          <div class="status-dot ${ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown'}"></div>
        </div>
      </div>
      ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
      <div class="card-meta">
        ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> excluded providers</div>` : ''}
        ${state === 'all' ? `<div class="meta-item">${esc(dsState)}</div>` : ''}
        ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
        ${ds.frequency  ? `<div class="meta-item">${ds.frequency}</div>` : ''}
      </div>
      ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
    </div>`;
  }).join('');

  // California sector + zip charts
  let sectorSection = '';
  if (state === 'California') {
    sectorSection = `
      <div style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Exclusions by Sector</div>
        <div id="bar-ca-sector" style="min-height:260px"><div style="color:var(--muted);font-size:12px;padding:8px 0">Loading…</div></div>
      </div>
      <div style="margin-bottom:24px">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Exclusions by Zip Code <span style="font-weight:400;color:var(--muted)">(top 20)</span></div>
        <div id="bar-ca-zip" style="min-height:260px"><div style="color:var(--muted);font-size:12px;padding:8px 0">Loading…</div></div>
      </div>`;
    setTimeout(() => {
      fetch('/api/stats/medicaid-by-sector?dataset=us_ca_med_exclusions')
        .then(r => r.json()).then(data => {
          const el = document.getElementById('bar-ca-sector');
          if (!el) return;
          el.innerHTML = '';
          drawBarChart('bar-ca-sector', data.slice(0, 20), '#4f8ef7');
        });
      fetch('/api/stats/medicaid-by-zipcode?dataset=us_ca_med_exclusions')
        .then(r => r.json()).then(data => {
          const el = document.getElementById('bar-ca-zip');
          if (!el) return;
          el.innerHTML = '';
          drawBarChart('bar-ca-zip', data.slice(0, 20), '#3ecf8e');
        });
    }, 0);
  }

  return header + sectorSection + cards;
}

function selectMedicaidState(state) {
  _selectedMedicaidState = state;
  const medDatasets = allDatasets.filter(d => (d.tags || []).includes('sector.usmed.debarment'));
  const byState = {};
  for (const ds of medDatasets) {
    const m = ds.name.match(/^us_([a-z]{2})_/);
    const s = m ? (US_STATE_NAMES[m[1]] || m[1].toUpperCase()) : 'Federal';
    if (!byState[s]) byState[s] = [];
    byState[s].push(ds);
  }
  // Update active state in left panel
  document.querySelectorAll('#med-state-list .country-row').forEach(row => {
    const active = row.dataset.state === state;
    row.style.background = active ? 'var(--surface2)' : 'transparent';
    row.style.borderLeft = `3px solid ${active ? 'var(--accent)' : 'transparent'}`;
    const name = row.querySelector('div > div:first-child');
    if (name) { name.style.color = active ? 'var(--text)' : 'var(--muted)'; name.style.fontWeight = active ? '600' : '400'; }
  });
  const panel = document.getElementById('med-datasets-panel');
  if (panel) panel.innerHTML = renderMedicaidStateDatasets(state, byState, medDatasets);
}

function filterMedicaidStates(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('#med-state-list .country-row').forEach(row => {
    const name = row.querySelector('div > div:first-child');
    const text = (name?.textContent || '').toLowerCase();
    row.style.display = text.includes(lower) ? '' : 'none';
  });
}

async function loadMedicaidPage(offset) {
  const body = document.getElementById('med-records-body');
  if (!body) return;

  const PAGE = 500;
  const res = await fetch(`/api/medicaid-records?offset=${offset}&limit=${PAGE}`);
  const data = await res.json();

  if (!data.results.length && offset === 0) {
    body.innerHTML = `<div class="empty"><div class="empty-icon">🏥</div><div>No records found</div></div>`;
    return;
  }

  const allKeys = new Set(data.results.flatMap(r => Object.keys(r)));

  if (offset === 0) {
    // First page — build the full shell
    const cols = ES_COL_PRIORITY.filter(k => allKeys.has(k));
    allKeys.forEach(k => { if (!cols.includes(k)) cols.push(k); });
    window._medRecordsData = { results: data.results, cols, total: data.total, loaded: data.results.length };

    const header = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;flex-wrap:wrap">
        <span id="med-count" style="font-size:13px;color:var(--muted)">
          Showing <strong style="color:var(--text)">${data.results.length.toLocaleString()}</strong> of
          <strong style="color:var(--text)">${data.total.toLocaleString()}</strong> excluded providers ·
          <strong style="color:var(--text)">${data.searched.length}</strong> state datasets
        </span>
        <div style="position:relative;margin-left:auto">
          <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Filter records…" oninput="filterMedicaidRecords(this.value)"
            style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px 6px 28px;font-size:12px;color:var(--text);outline:none;width:220px">
        </div>
      </div>`;

    const moreBtn = data.loaded < data.total
      ? `<div id="med-load-more" style="text-align:center;padding:16px">
           <button onclick="loadMedicaidPage(${PAGE})"
             style="padding:8px 20px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--accent);font-size:13px;cursor:pointer">
             Load next ${PAGE.toLocaleString()} records (${(data.total - PAGE).toLocaleString()} remaining)
           </button>
         </div>` : '';

    body.innerHTML = header +
      `<div style="overflow-x:auto"><table id="med-table" style="width:100%;border-collapse:collapse;font-size:12px">${buildGenericTable(data.results, cols)}</table></div>` +
      moreBtn;

  } else {
    // Append more rows to existing table
    const d = window._medRecordsData;
    d.results = d.results.concat(data.results);
    d.loaded = d.results.length;

    const tbl = document.getElementById('med-table');
    if (tbl) tbl.innerHTML = buildGenericTable(d.results, d.cols);

    const nextOffset = offset + PAGE;
    const moreEl = document.getElementById('med-load-more');
    if (moreEl) {
      if (nextOffset < data.total) {
        moreEl.innerHTML = `<button onclick="loadMedicaidPage(${nextOffset})"
          style="padding:8px 20px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--accent);font-size:13px;cursor:pointer">
          Load next ${PAGE.toLocaleString()} records (${(data.total - nextOffset).toLocaleString()} remaining)
        </button>`;
      } else {
        moreEl.remove();
      }
    }

    const countEl = document.getElementById('med-count');
    if (countEl) {
      countEl.innerHTML = `Showing <strong style="color:var(--text)">${d.results.length.toLocaleString()}</strong> of
        <strong style="color:var(--text)">${data.total.toLocaleString()}</strong> excluded providers`;
    }
  }
}


function filterMedicaidRecords(q) {
  clearTimeout(_medFilterTimer);
  _medFilterTimer = setTimeout(() => {
    const d = window._medRecordsData;
    if (!d) return;
    const lower = q.toLowerCase().trim();
    const filtered = lower
      ? d.results.filter(r => Object.values(r).some(v => v && String(v).toLowerCase().includes(lower)))
      : d.results;
    const tbl = document.getElementById('med-table');
    if (tbl) tbl.innerHTML = buildGenericTable(filtered, d.cols);
  }, 200);
}
