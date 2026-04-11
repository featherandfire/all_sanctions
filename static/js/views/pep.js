let _selectedPepCountry = 'all';

function _countryFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  try {
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
  } catch (_) { return '🌐'; }
}

function renderPepView() {
  const content = document.getElementById('content');
  const pepDatasets = allDatasets.filter(d => (d.tags || []).includes('list.pep'));
  const totalEntities = pepDatasets.reduce((s, d) => s + (d.entity_count || 0), 0);
  const totalTargets  = pepDatasets.reduce((s, d) => s + (d.target_count || 0), 0);

  // Group by country, tracking ISO code for flag rendering
  const byCountry = {};
  const countryCode = {};
  for (const ds of pepDatasets) {
    const c = ds.publisher_country_label || ds.publisher_country || 'Global';
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(ds);
    if (!countryCode[c]) countryCode[c] = ds.publisher_country || '';
  }
  const countryList = Object.entries(byCountry).sort(
    (a, b) => b[1].reduce((s, d) => s + (d.entity_count || 0), 0)
             - a[1].reduce((s, d) => s + (d.entity_count || 0), 0)
  );

  if (_selectedPepCountry !== 'all' && !byCountry[_selectedPepCountry]) {
    _selectedPepCountry = 'all';
  }

  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-value">${pepDatasets.length}</div><div class="stat-label">Datasets</div></div>
      <div class="stat-card"><div class="stat-value">${totalEntities.toLocaleString()}</div><div class="stat-label">Total Entities</div></div>
      <div class="stat-card"><div class="stat-value">${totalTargets.toLocaleString()}</div><div class="stat-label">Total Targets</div></div>
      <div class="stat-card"><div class="stat-value">${countryList.length}</div><div class="stat-label">Countries</div></div>
    </div>`;

  const bodyHtml = statStrip + `
      <div class="med-split-layout">

        <!-- Country list (left) -->
        <div class="med-state-panel">
          <div class="med-state-panel-header">
            <div style="position:relative">
              <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input id="pep-country-search" type="text" placeholder="Filter countries…" oninput="filterPepCountries(this.value)"
                class="med-search-input" style="width:100%">
            </div>
          </div>
          <div id="pep-country-list">
            ${_renderPepCountryRows(countryList, pepDatasets, countryCode)}
          </div>
        </div>

        <!-- Datasets panel (right) -->
        <div style="flex:1;overflow-y:auto;padding:20px 24px" id="pep-datasets-panel">
          ${_renderPepCountryDatasets(_selectedPepCountry, byCountry, pepDatasets, countryCode)}
        </div>
      </div>`;

  if (!BannerAnimation.isActive() || !document.getElementById('pep-banner-canvas')) {
    content.innerHTML = `<div class="home-banner-wrap home-banner-wrap--sm"><canvas id="pep-banner-canvas"></canvas></div><div id="pep-body">${bodyHtml}</div>`;
    BannerAnimation.init(document.getElementById('pep-banner-canvas'));
  } else {
    document.getElementById('pep-body').innerHTML = bodyHtml;
  }
}

function _renderPepCountryRows(countryList, pepDatasets, countryCode = {}) {
  const allActive = _selectedPepCountry === 'all';
  const allRow = `<div class="country-row med-state-row" data-country="all" onclick="selectPepCountry('all')"
    style="background:${allActive ? 'var(--surface2)' : 'transparent'};border-left:3px solid ${allActive ? 'var(--accent)' : 'transparent'}">
    <span style="font-size:18px;line-height:1;flex-shrink:0">🌐</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;color:${allActive ? 'var(--text)' : 'var(--muted)'};font-weight:${allActive ? '600' : '400'}">All Countries</div>
      <div class="med-state-subtext">${pepDatasets.length} dataset${pepDatasets.length !== 1 ? 's' : ''}</div>
    </div>
  </div>`;

  const rows = countryList.map(([country, dsList]) => {
    const active = _selectedPepCountry === country;
    const n = dsList.reduce((s, d) => s + (d.entity_count || 0), 0);
    const flag = _countryFlag(countryCode[country] || '');
    return `<div class="country-row med-state-row" data-country="${esc(country)}" onclick="selectPepCountry('${esc(country)}')"
      style="background:${active ? 'var(--surface2)' : 'transparent'};border-left:3px solid ${active ? 'var(--accent)' : 'transparent'}">
      <span style="font-size:18px;line-height:1;flex-shrink:0">${flag}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:${active ? 'var(--text)' : 'var(--muted)'};font-weight:${active ? '600' : '400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(country)}</div>
        <div class="med-state-subtext">
          ${dsList.length} dataset${dsList.length !== 1 ? 's' : ''} · ${fmtNum(n)} entities
        </div>
      </div>
    </div>`;
  }).join('');

  return allRow + rows;
}

function _renderPepCountryDatasets(country, byCountry, pepDatasets, countryCode = {}) {
  const dsList = country === 'all' ? pepDatasets : (byCountry[country] || []);
  const sorted = [...dsList].sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0));
  const totalEntities = dsList.reduce((s, d) => s + (d.entity_count || 0), 0);
  const flag = country === 'all' ? '🌐' : _countryFlag(countryCode[country] || '');

  const header = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">
      <span style="font-size:24px">${flag}</span>
      <div>
        <div style="font-size:18px;font-weight:700">${country === 'all' ? 'All Countries' : esc(country)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">
          ${dsList.length} dataset${dsList.length !== 1 ? 's' : ''} · ${fmtNum(totalEntities)} entities
        </div>
      </div>
    </div>`;

  // All Countries → bar chart + records grid with View buttons
  if (country === 'all') {
    // Build chart data from byCountry
    const chartData = Object.entries(byCountry)
      .map(([c, dsList]) => ({ label: c, value: dsList.reduce((s, d) => s + (d.entity_count || 0), 0) }))
      .filter(d => d.label !== 'Global')
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    setTimeout(() => {
      const el = document.getElementById('pep-country-chart');
      if (!el || !chartData.length) return;
      drawBarChart('pep-country-chart', chartData, 'var(--accent2)');
    }, 0);

    const recordsGrid = `
      <div style="margin-bottom:24px">
        <div class="med-chart-label">PEP Records by Country <span style="font-weight:400;color:var(--muted)">(top 20)</span></div>
        <div id="pep-country-chart"></div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px">
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px">
          PEP records total over <strong style="color:var(--text)">2.2 million</strong> entities across ${sorted.length} datasets.
          Select a dataset to browse records, or search across all via Entity Search.
        </div>
        <button onclick="switchView('entity-search')"
          style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:12px;cursor:pointer;font-weight:600">
          Open Entity Search →
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">
        ${sorted.map(ds => `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ds.title)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${(ds.entity_count||0).toLocaleString()} entities · ${esc(ds.publisher_country_label||'Global')}</div>
            </div>
            <button onclick="openResourceTableForDataset('${ds.name}')"
              style="padding:4px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;font-size:11px;color:var(--accent);cursor:pointer;flex-shrink:0">
              View
            </button>
          </div>`).join('')}
      </div>`;
    return header + recordsGrid;
  }

  // Per-country → dataset cards
  const cards = sorted.map(ds => {
    const dsCountry = ds.publisher_country_label || ds.publisher_country || 'Global';
    const statusColor = ds.result === 'success' ? 'var(--green)' : ds.result ? 'var(--red)' : 'var(--muted)';
    const tags = (ds.tags || []).slice(0, 3).map(t =>
      `<span style="padding:2px 7px;background:var(--tag-bg);color:var(--tag-text);border-radius:10px;font-size:10px">${esc(t)}</span>`
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
        ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
        ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
        <div class="meta-item">${esc(dsCountry)}</div>
        ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
        ${ds.frequency  ? `<div class="meta-item">${ds.frequency}</div>` : ''}
      </div>
      ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
    </div>`;
  }).join('');

  return header + cards;
}

function selectPepCountry(country) {
  _selectedPepCountry = country;
  document.querySelectorAll('#pep-country-list .country-row').forEach(row => {
    const active = row.dataset.country === country;
    row.style.background = active ? 'var(--surface2)' : 'transparent';
    row.style.borderLeft = `3px solid ${active ? 'var(--accent)' : 'transparent'}`;
    const name = row.querySelector('div > div:first-child');
    if (name) { name.style.color = active ? 'var(--text)' : 'var(--muted)'; name.style.fontWeight = active ? '600' : '400'; }
  });

  const pepDatasets = allDatasets.filter(d => (d.tags || []).includes('list.pep'));
  const byCountry = {};
  const countryCode = {};
  for (const ds of pepDatasets) {
    const c = ds.publisher_country_label || ds.publisher_country || 'Global';
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(ds);
    if (!countryCode[c]) countryCode[c] = ds.publisher_country || '';
  }

  const panel = document.getElementById('pep-datasets-panel');
  if (panel) panel.innerHTML = _renderPepCountryDatasets(country, byCountry, pepDatasets, countryCode);
}

function filterPepCountries(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('#pep-country-list .country-row').forEach(row => {
    const name = row.querySelector('div > div:first-child');
    const text = (name?.textContent || '').toLowerCase();
    row.style.display = text.includes(lower) ? '' : 'none';
  });
}
