let allDatasets = [];
let currentView = 'datasets';
let currentLayout = 'grid';
let searchTimer = null;

// View-level API response caches — avoids re-fetching on tab revisit
let _statsMeta = null;
let _tagsMeta  = null;

const US_STATE_NAMES = {
  ak:'Alaska', al:'Alabama', ar:'Arkansas', az:'Arizona', ca:'California',
  co:'Colorado', ct:'Connecticut', dc:'DC', de:'Delaware', fl:'Florida',
  ga:'Georgia', hi:'Hawaii', ia:'Iowa', id:'Idaho', il:'Illinois',
  in:'Indiana', ks:'Kansas', ky:'Kentucky', la:'Louisiana', ma:'Massachusetts',
  md:'Maryland', me:'Maine', mi:'Michigan', mn:'Minnesota', mo:'Missouri',
  ms:'Mississippi', mt:'Montana', nc:'North Carolina', nd:'North Dakota',
  ne:'Nebraska', nh:'New Hampshire', nj:'New Jersey', nm:'New Mexico',
  nv:'Nevada', ny:'New York', oh:'Ohio', ok:'Oklahoma', or:'Oregon',
  pa:'Pennsylvania', ri:'Rhode Island', sc:'South Carolina', sd:'South Dakota',
  tn:'Tennessee', tx:'Texas', ut:'Utah', va:'Virginia', vt:'Vermont',
  wa:'Washington', wi:'Wisconsin', wv:'West Virginia', wy:'Wyoming',
};

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  await loadDatasets();
  renderDatasetsView();
}

async function loadDatasets() {
  const res = await fetch('/api/datasets');
  allDatasets = await res.json();
}

// ── View switching ────────────────────────────────────────────────────────

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const titles = { datasets: 'Browse Datasets', stats: 'Statistics', cyber: 'Cyber & Crypto', pep: 'Politically Exposed Persons', medicaid: 'Medicaid Exclusions', 'entity-search': 'Entity Search', countries: 'By Country', tags: 'Tags' };
  document.getElementById('page-title').textContent = titles[view];
  const isDatasets = view === 'datasets';
  document.getElementById('search-wrap').style.display = isDatasets ? '' : 'none';
  document.getElementById('filter-select').style.display = isDatasets ? '' : 'none';
  document.getElementById('view-toggle').style.display = isDatasets ? '' : 'none';

  if (view === 'datasets') renderDatasetsView();
  else if (view === 'stats') renderStatsView();
  else if (view === 'cyber') renderCyberView();
  else if (view === 'pep') renderPepView();
  else if (view === 'medicaid') renderMedicaidView();
  else if (view === 'entity-search') renderEntitySearchView();
  else if (view === 'countries') renderCountryView();
  else if (view === 'tags') renderTagsView();
}

// ── Dataset view ──────────────────────────────────────────────────────────

function renderDatasetsView(datasets) {
  const data = datasets || allDatasets;
  const content = document.getElementById('content');
  if (!data.length) {
    content.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div>No datasets found</div></div>`;
    return;
  }

  const grid = currentLayout === 'grid' ? 'cards-grid' : 'cards-list';
  const cards = data.map(ds => currentLayout === 'grid' ? renderCard(ds) : renderListCard(ds)).join('');
  content.innerHTML = `
    <div class="results-header">
      <div class="results-count">${data.length.toLocaleString()} dataset${data.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="${grid}">${cards}</div>
  `;
}

function renderCard(ds) {
  const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
  const tags = (ds.tags || []).slice(0, 4).map(t =>
    `<span class="card-tag" onclick="filterByTag(event,'${t}')">${t}</span>`
  ).join('');
  const pub = ds.publisher_name ? `${ds.publisher_name}${ds.publisher_country_label ? ` · ${ds.publisher_country_label}` : ''}` : '';
  return `<div class="dataset-card" onclick="showDetail('${ds.name}')">
    <div class="card-header">
      <div>
        <div class="card-title">${esc(ds.title)}</div>
        <div class="card-name">${esc(ds.name)}</div>
      </div>
      <div class="status-dot ${statusClass}" title="${ds.result || 'unknown'}"></div>
    </div>
    ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
    <div class="card-meta">
      ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
      ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
      ${pub ? `<div class="meta-item">${esc(pub)}</div>` : ''}
      ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
    </div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
  </div>`;
}

function renderListCard(ds) {
  const pub = ds.publisher_name || '';
  return `<div class="list-card" onclick="showDetail('${ds.name}')">
    <div class="list-name">${esc(ds.name)}</div>
    <div class="list-title">${esc(ds.title)}</div>
    <div class="list-publisher">${esc(pub)}</div>
    <div class="list-entities">${ds.entity_count ? ds.entity_count.toLocaleString() : '—'}</div>
    <div class="list-date">${ds.updated_at || '—'}</div>
  </div>`;
}

// ── Search ────────────────────────────────────────────────────────────────

function onSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(val), 220);
}

async function doSearch(q) {
  const field = document.getElementById('filter-select').value;
  if (!q.trim()) {
    renderDatasetsView(allDatasets);
    return;
  }
  const params = new URLSearchParams({ q: q.trim() });
  if (field) params.set('field', field);
  const res = await fetch('/api/search?' + params);
  const results = await res.json();
  renderDatasetsView(results);
}

function onFilterChange() {
  const q = document.getElementById('search-input').value;
  if (q.trim()) doSearch(q);
}

// ── Layout toggle ─────────────────────────────────────────────────────────

function setLayout(layout) {
  currentLayout = layout;
  document.getElementById('grid-btn').classList.toggle('active', layout === 'grid');
  document.getElementById('list-btn').classList.toggle('active', layout === 'list');
  const q = document.getElementById('search-input').value;
  if (q.trim()) doSearch(q);
  else renderDatasetsView(allDatasets);
}

// ── Detail panel ──────────────────────────────────────────────────────────

async function showDetail(name) {
  const res = await fetch(`/api/dataset/${name}`);
  const ds = await res.json();

  document.getElementById('detail-title').textContent = ds.title;
  document.getElementById('detail-name').textContent = ds.name;

  const statusColor = ds.result === 'success' ? 'var(--green)' : ds.result ? 'var(--red)' : 'var(--muted)';
  const tags = (ds.tags || []).map(t =>
    `<span class="detail-tag" style="cursor:pointer" onclick="filterByTag(event,'${t}')">${t}</span>`
  ).join('');
  const collections = (ds.collections || []).join(', ');
  const resources = (ds.resources || []).map(r => {
    const kb = r.size ? `${(r.size / 1024).toLocaleString(undefined, {maximumFractionDigits:0})} KB` : '';
    const isJson = r.name.endsWith('.json');
    const viewBtn = isJson ? `
      <button onclick="event.stopPropagation();openResourceTable('${r.url}','${esc(r.name)}')"
        style="background:var(--accent);border:none;color:#fff;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;margin-right:4px">
        View
      </button>` : '';
    return `<div class="resource-item">
      <span class="resource-name">${esc(r.name)}</span>
      <span class="resource-size">${kb}</span>
      ${viewBtn}
      <a class="resource-link" href="${r.url}" target="_blank" title="Download">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>`;
  }).join('');

  document.getElementById('detail-body').innerHTML = `
    <div class="nums-row">
      <div class="num-box">
        <div class="big-num" style="color:var(--accent)">${(ds.entity_count||0).toLocaleString()}</div>
        <div class="num-box-label">Entities</div>
      </div>
      <div class="num-box">
        <div class="big-num" style="color:var(--green)">${(ds.target_count||0).toLocaleString()}</div>
        <div class="num-box-label">Targets</div>
      </div>
      <div class="num-box">
        <div class="big-num" style="color:var(--yellow)">${(ds.thing_count||0).toLocaleString()}</div>
        <div class="num-box-label">Things</div>
      </div>
    </div>

    ${ds.description || ds.summary ? `
    <div class="detail-section">
      <div class="detail-section-title">About</div>
      <div class="detail-description">${esc(ds.description || ds.summary)}</div>
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-title">Details</div>
      ${row('Type', ds.type)}
      ${row('Status', `<span style="color:${statusColor}">${ds.result || 'unknown'}</span>`)}
      ${row('Updated', ds.updated_at)}
      ${row('Last change', ds.last_change)}
      ${row('Frequency', ds.frequency)}
      ${row('Collections', collections)}
    </div>

    ${ds.publisher_name ? `
    <div class="detail-section">
      <div class="detail-section-title">Publisher</div>
      ${row('Name', ds.publisher_name)}
      ${row('Country', ds.publisher_country_label || ds.publisher_country)}
      ${row('Official', ds.publisher_official ? 'Yes' : 'No')}
    </div>` : ''}

    ${tags ? `
    <div class="detail-section">
      <div class="detail-section-title">Tags</div>
      <div class="detail-tags">${tags}</div>
    </div>` : ''}

    ${resources ? `
    <div class="detail-section">
      <div class="detail-section-title">Resources</div>
      ${resources}
    </div>` : ''}
  `;

  document.getElementById('detail-overlay').style.display = 'flex';
}

function row(label, val) {
  if (!val) return '';
  return `<div class="detail-row"><div class="detail-key">${label}</div><div class="detail-val">${val}</div></div>`;
}

function closeDetail(e) {
  if (e.target === document.getElementById('detail-overlay')) closeDetailPanel();
}

function closeDetailPanel() {
  document.getElementById('detail-overlay').style.display = 'none';
}

// ── Stats view ────────────────────────────────────────────────────────────

async function renderStatsView() {
  const content = document.getElementById('content');

  let s, cyberData;
  if (_statsMeta) {
    ({ s, cyberData } = _statsMeta);
  } else {
    content.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Loading statistics…</div></div>`;
    // Fetch stats + cyber data in parallel; SDN country data loads separately (slow)
    const [statsRes, cyberRes] = await Promise.all([fetch('/api/stats'), fetch('/api/cyber')]);
    s = await statsRes.json();
    cyberData = await cyberRes.json();
    _statsMeta = { s, cyberData };
  }

  // Cyber by country pie loads async from entity-level scan (see bottom of function)

  // ── Medicaid records by US state (pie data) ──────────────────────────────
  const medicaidByState = {};
  for (const ds of allDatasets) {
    if (!(ds.tags || []).includes('sector.usmed.debarment')) continue;
    const m = ds.name.match(/^us_([a-z]{2})_/);
    const state = m ? (US_STATE_NAMES[m[1]] || m[1].toUpperCase()) : 'Federal';
    medicaidByState[state] = (medicaidByState[state] || 0) + (ds.entity_count || 0);
  }
  const medicaidPieData = Object.entries(medicaidByState)
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([label, value]) => ({ label, value }));

  // Store for use in the rate chart (computed after population data loads)
  _statsMeta.medicaidByState = medicaidByState;

  // ── PEP records by country (bar data) ────────────────────────────────────
  const pepByCountry = {};
  for (const ds of allDatasets) {
    if (!(ds.tags || []).includes('list.pep')) continue;
    const country = ds.publisher_country_label || ds.publisher_country || 'Global';
    pepByCountry[country] = (pepByCountry[country] || 0) + (ds.entity_count || 0);
  }
  const pepBarData = Object.entries(pepByCountry)
    .sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([label, value]) => ({ label, value }));

  // ── Bar charts ───────────────────────────────────────────────────────────
  const topMax = s.top_datasets[0]?.entity_count || 1;
  const topBars = s.top_datasets.map(d => `
    <div class="bar-row">
      <div class="bar-label" style="cursor:pointer" onclick="jumpToDataset('${d.name}')" title="${esc(d.name)}">${esc(d.title)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(d.entity_count/topMax*100)}%"></div></div>
      <div class="bar-num">${d.entity_count.toLocaleString()}</div>
    </div>`).join('');

  const countryMax = s.top_countries[0]?.[1] || 1;
  const countryBars = s.top_countries.map(([c, n]) => `
    <div class="bar-row">
      <div class="bar-label short">${c}</div>
      <div class="bar-track"><div class="bar-fill green" style="width:${Math.round(n/countryMax*100)}%"></div></div>
      <div class="bar-num">${n}</div>
    </div>`).join('');

  const tagItems = s.top_tags.map(([t, n]) =>
    `<span class="tag-pill" onclick="filterByTag(null,'${t}')">${t} <span class="tag-count">${n}</span></span>`
  ).join('');

  const runDate = s.run_time ? s.run_time.replace('T', ' ').slice(0, 16) : 'N/A';

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Datasets</div><div class="stat-value accent">${s.total.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Sources</div><div class="stat-value">${s.sources.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Collections</div><div class="stat-value">${s.collections.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Entities</div><div class="stat-value green">${s.total_entities.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Targets</div><div class="stat-value green">${s.total_targets.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Countries</div><div class="stat-value">${s.countries.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Crawl Errors</div><div class="stat-value ${s.errors ? 'red' : ''}">${s.errors}</div></div>
      <div class="stat-card"><div class="stat-label">Index Updated</div><div class="stat-value" style="font-size:14px">${runDate}</div></div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Top Datasets by Entity Count</div>
        ${topBars}
      </div>
      <div class="chart-card">
        <div class="chart-title">Top Publisher Countries</div>
        ${countryBars}
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Cyber &amp; Crypto Records by Country</div>
        <div id="pie-cyber" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="color:var(--muted);font-size:12px;padding:8px 0">Loading entity data…</div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Blacklisted Medicaid providers by US State</div>
        <div id="pie-medicaid" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap"></div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">US Population by State <span style="font-size:10px;color:var(--muted);font-weight:400">ACS 2022</span></div>
        <div id="pie-population" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="color:var(--muted);font-size:12px;padding:8px 0">Loading Census data…</div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Medicaid Exclusion Rate by State <span style="font-size:10px;color:var(--muted);font-weight:400">exclusion % share minus population % share</span></div>
        <div id="pie-medicaid-rate" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="color:var(--muted);font-size:12px;padding:8px 0">Loading…</div>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">OFAC SDN Crypto Wallets by Country</div>
        <div id="bar-sdn-crypto" style="width:100%">
          <div style="color:var(--muted);font-size:12px;padding:8px 0">Loading SDN data… (cached after first load)</div>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">PEP Records by Country</div>
        <div id="bar-pep" style="width:100%"></div>
      </div>
    </div>

    <div class="tags-section">
      <div class="chart-title">Topic Tags</div>
      <div class="tags-cloud">${tagItems}</div>
    </div>
  `;

  drawPieChart('pie-medicaid', medicaidPieData, ['#4f8ef7','#3ecf8e','#f6c90e','#f56565','#a78bfa','#fb923c','#e879f9','#34d399','#60a5fa','#f97316','#94a3b8','#64748b','#fbbf24','#c084fc','#86efac']);

  // Cyber by country — entity-level scan across all crypto datasets (async, slow on first load)
  const CYBER_PIE_COLORS = ['#f6c90e','#f56565','#a78bfa','#4f8ef7','#3ecf8e','#fb923c','#64748b','#e879f9','#34d399','#60a5fa','#f97316','#94a3b8'];
  if (_statsMeta.cyberCountryData) {
    drawPieChart('pie-cyber', _statsMeta.cyberCountryData, CYBER_PIE_COLORS);
  } else {
    fetch('/api/stats/crypto-by-country').then(r => r.json()).then(cyberCountryData => {
      _statsMeta.cyberCountryData = cyberCountryData;
      const el = document.getElementById('pie-cyber');
      if (!el) return;
      el.innerHTML = '';
      drawPieChart('pie-cyber', cyberCountryData, CYBER_PIE_COLORS);
    });
  }

  // PEP bar chart renders immediately (data already computed)
  drawBarChart('bar-pep', pepBarData, '#4f8ef7');

  // SDN crypto bar chart loads async (requires fetching entity data)
  if (_statsMeta.sdnData) {
    drawBarChart('bar-sdn-crypto', _statsMeta.sdnData, '#f6c90e');
  } else {
    fetch('/api/stats/sdn-crypto-country').then(r => r.json()).then(sdnData => {
      _statsMeta.sdnData = sdnData;
      const el = document.getElementById('bar-sdn-crypto');
      if (!el) return;
      el.innerHTML = '';
      drawBarChart('bar-sdn-crypto', sdnData, '#f6c90e');
    });
  }

  // US population by state pie chart (Census API, cached after first load)
  const POP_COLORS = [
    '#4f8ef7','#3ecf8e','#f6c90e','#f56565','#a78bfa','#fb923c',
    '#e879f9','#34d399','#60a5fa','#f97316','#94a3b8','#64748b',
    '#fbbf24','#c084fc','#86efac','#38bdf8',
  ];
  if (_statsMeta.popData) {
    drawPieChart('pie-population', _statsMeta.popData.slice(0, 15), POP_COLORS);
    _drawMedicaidRateChart();
  } else {
    fetch('/api/stats/population-by-state').then(r => r.json()).then(popData => {
      _statsMeta.popData = popData;
      const popEl = document.getElementById('pie-population');
      if (popEl) { popEl.innerHTML = ''; drawPieChart('pie-population', popData.slice(0, 15), POP_COLORS); }
      _drawMedicaidRateChart();
    });
  }
}

function drawBarChart(containerId, data, color) {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const margin = { top: 16, right: 16, bottom: 72, left: 56 };
  const totalW = container.clientWidth || 480;
  const totalH = 280;
  const w = totalW - margin.left - margin.right;
  const h = totalH - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`).append('svg')
    .attr('width', totalW).attr('height', totalH)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.28);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.08]).nice().range([h, 0]);

  // Grid lines
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
    .selectAll('line').style('stroke', '#2a2f3d').style('stroke-dasharray', '3,3');
  svg.select('.domain').remove();

  // Y axis
  svg.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(n => n >= 1000 ? (n/1000).toFixed(0)+'k' : n))
    .selectAll('text').style('fill', '#64748b').style('font-size', '11px');
  svg.selectAll('.tick line').style('display', 'none');

  // X axis
  svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
    .selectAll('text')
    .style('fill', '#64748b').style('font-size', '11px')
    .attr('transform', 'rotate(-38)').style('text-anchor', 'end');
  svg.select('.domain').style('stroke', '#2a2f3d');

  // Tooltip
  let tip = document.getElementById('bar-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'bar-tooltip';
    tip.style.cssText = 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:7px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none';
    document.body.appendChild(tip);
  }

  // Bars
  svg.selectAll('.bar').data(data).enter().append('rect')
    .attr('x', d => x(d.label)).attr('y', d => y(d.value))
    .attr('width', x.bandwidth()).attr('height', d => h - y(d.value))
    .attr('fill', color).attr('rx', 3).attr('opacity', 0.88)
    .style('cursor', 'pointer')
    .on('mousemove', function(event, d) {
      tip.style.display = 'block';
      tip.style.left = (event.clientX + 12) + 'px';
      tip.style.top  = (event.clientY - 10) + 'px';
      tip.innerHTML = `<strong>${esc(d.label)}</strong><br>${d.value.toLocaleString()} records`;
      d3.select(this).attr('opacity', 1);
    })
    .on('mouseleave', function() { tip.style.display = 'none'; d3.select(this).attr('opacity', 0.88); });

  // Value labels on top of bars (only if bar is wide enough)
  if (x.bandwidth() > 22) {
    svg.selectAll('.bar-label').data(data).enter().append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', d => y(d.value) - 4)
      .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', '#94a3b8')
      .text(d => d.value >= 1000 ? (d.value/1000).toFixed(1)+'k' : d.value);
  }
}

// opts: { unit, centerLabel, centerValue, valueFmt, legendFmt }
//   unit        — word after the value in the tooltip  (default: 'entities')
//   centerLabel — small text below the center number   (default: 'entities')
//   centerValue — override the center big number text  (default: formatted total)
//   valueFmt    — fn(value) for tooltip value display  (default: toLocaleString)
//   legendFmt   — fn(value, pct) for legend right col  (default: pct + '%')
function drawPieChart(containerId, data, colors, opts) {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const unit        = (opts && opts.unit)        || 'entities';
  const centerLabel = (opts && opts.centerLabel) || 'entities';
  const centerValue = (opts && opts.centerValue) || null;
  const valueFmt    = (opts && opts.valueFmt)    || (v => v.toLocaleString());
  const legendFmt   = (opts && opts.legendFmt)   || ((_v, pct) => pct + '%');

  const size = 220;
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.42;
  const total = data.reduce((s, d) => s + d.value, 0);

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', size).attr('height', size)
    .attr('style', 'flex-shrink:0');

  const g = svg.append('g').attr('transform', `translate(${size/2},${size/2})`);

  const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.018);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(3);
  const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 6).cornerRadius(3);

  // Tooltip div (shared)
  let tip = document.getElementById('pie-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'pie-tooltip';
    tip.style.cssText = 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:8px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none;max-width:200px;line-height:1.5';
    document.body.appendChild(tip);
  }

  g.selectAll('path')
    .data(pie(data))
    .enter().append('path')
    .attr('d', arc)
    .attr('fill', (_, i) => colors[i % colors.length])
    .attr('stroke', '#0d0f14').attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mousemove', function(event, d) {
      const pct = ((d.data.value / total) * 100).toFixed(1);
      tip.style.display = 'block';
      tip.style.left = (event.clientX + 14) + 'px';
      tip.style.top  = (event.clientY - 10) + 'px';
      tip.innerHTML = `<strong>${esc(d.data.label)}</strong><br>${valueFmt(d.data.value)} ${unit}<br><span style="color:#64748b">${pct}% of chart</span>`;
      d3.select(this).attr('d', arcHover);
    })
    .on('mouseleave', function() {
      tip.style.display = 'none';
      d3.select(this).attr('d', arc);
    });

  // Centre label
  const centerText = centerValue !== null ? centerValue
    : (total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toLocaleString());
  g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em')
    .style('font-size', '15px').style('font-weight', '700').style('fill', '#e2e8f0')
    .text(centerText);
  g.append('text').attr('text-anchor', 'middle').attr('dy', '1.1em')
    .style('font-size', '10px').style('fill', '#64748b')
    .text(centerLabel);

  // Legend
  const legend = d3.select(`#${containerId}`)
    .append('div')
    .attr('style', 'flex:1;min-width:120px;display:flex;flex-direction:column;gap:5px;padding-top:6px;max-height:220px;overflow-y:auto');

  data.forEach((d, i) => {
    const pct = ((d.value / total) * 100).toFixed(1);
    legend.append('div')
      .attr('style', 'display:flex;align-items:center;gap:7px;font-size:11px;color:#e2e8f0;cursor:default')
      .html(`<span style="width:10px;height:10px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></span>
             <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(d.label)}">${esc(d.label)}</span>
             <span style="color:#64748b;flex-shrink:0">${legendFmt(d.value, pct)}</span>`);
  });
}

function _drawMedicaidRateChart() {
  const el = document.getElementById('pie-medicaid-rate');
  if (!el || !_statsMeta || !_statsMeta.popData || !_statsMeta.medicaidByState) return;

  // Build state-name → population lookup
  const popMap = {};
  for (const { label, value } of _statsMeta.popData) popMap[label] = value;

  // National totals
  const totalExcluded = Object.values(_statsMeta.medicaidByState).reduce((s, n) => s + n, 0);
  const totalPop      = _statsMeta.popData.reduce((s, r) => s + r.value, 0);

  // Overrepresentation = (state_excluded% of national) - (state_pop% of national)
  // Positive → state has disproportionately more exclusions than its population share
  const rateData = [];
  for (const [state, excluded] of Object.entries(_statsMeta.medicaidByState)) {
    const pop = popMap[state];
    if (!pop || !excluded) continue;
    const exclPct = (excluded / totalExcluded) * 100;
    const popPct  = (pop      / totalPop)      * 100;
    const diff    = parseFloat((exclPct - popPct).toFixed(4));
    if (diff > 0) rateData.push({ label: state, value: diff });
  }
  rateData.sort((a, b) => b.value - a.value);

  el.innerHTML = '';
  const RATE_COLORS = [
    '#f56565','#fb923c','#f6c90e','#3ecf8e','#4f8ef7','#a78bfa',
    '#e879f9','#34d399','#60a5fa','#f97316','#94a3b8','#64748b',
    '#fbbf24','#c084fc','#86efac',
  ];

  drawPieChart('pie-medicaid-rate', rateData.slice(0, 15), RATE_COLORS, {
    unit: 'pp over population share',
    centerLabel: 'states',
    centerValue: rateData.slice(0, 15).length.toString(),
    valueFmt: v => '+' + v.toFixed(2) + 'pp',
    legendFmt: v => '+' + v.toFixed(2) + 'pp',
  });
}

function jumpToDataset(name) {
  switchView('datasets');
  document.getElementById('search-input').value = name;
  doSearch(name);
  setTimeout(() => showDetail(name), 400);
}

// ── Cyber & Crypto view ───────────────────────────────────────────────────

const CATEGORY_META = {
  'crypto':         { label: 'Cryptocurrency',    color: '#f6c90e', icon: '₿' },
  'ransomware':     { label: 'Ransomware',         color: '#f56565', icon: '🔒' },
  'state-sponsored':{ label: 'State-Sponsored',   color: '#a78bfa', icon: '🎯' },
  'cyber':          { label: 'Cyber Actors',       color: '#4f8ef7', icon: '💻' },
  'darknet':        { label: 'Darknet',            color: '#fb923c', icon: '🕸' },
  'other':          { label: 'Other',              color: '#64748b', icon: '⚠' },
};

let _cyberTab = 'datasets';   // 'datasets' | 'records'
let _cyberMeta = null;        // cached cyber API response
let _cyberFilterTimer = null;

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

function buildCyberRecordsTable(rows, cols) {
  const thead = `<thead><tr style="position:sticky;top:0;z-index:1">${
    cols.map(k => {
      const w = COL_WIDTHS[k] || 130;
      return `<th style="padding:8px 12px;text-align:left;background:var(--surface2);color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;min-width:${w}px">${ES_COL_LABELS[k] || k}</th>`;
    }).join('')
  }</tr></thead>`;

  const tbody = `<tbody>${rows.map((r, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    const cells = cols.map(k => {
      const val = r[k] || '';
      let cell = '';
      if (k === 'schema') {
        const color = SCHEMA_COLORS[val] || 'var(--muted)';
        cell = val ? `<span style="padding:2px 8px;background:${color}18;color:${color};border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === 'caption' || k === 'publicKey') {
        cell = val ? `<span style="font-family:monospace;font-size:11px;color:var(--yellow)">${esc(val)}</span>` : '';
      } else if (k === 'currency') {
        cell = val ? `<span style="padding:2px 8px;background:#f6c90e18;color:var(--yellow);border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === '_dataset') {
        cell = val ? `<span style="font-size:11px;color:var(--accent);font-family:monospace">${esc(val)}</span>` : '';
      } else if (k === 'id') {
        cell = val ? `<span style="font-family:monospace;font-size:10px;color:var(--muted)">${esc(val)}</span>` : '';
      } else if (k === 'first_seen' || k === 'last_seen' || k === 'last_change') {
        cell = val ? `<span style="font-size:11px;color:var(--muted)">${esc(val.slice(0,10))}</span>` : '';
      } else {
        cell = val ? `<span style="font-size:11px">${esc(String(val))}</span>` : '';
      }
      return `<td style="padding:7px 12px;border-bottom:1px solid var(--border);vertical-align:top;white-space:normal">${cell || '<span style="color:var(--border)">—</span>'}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('')}</tbody>`;

  return thead + tbody;
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

function buildCryptoTable(rows, cols) {
  const thead = `<thead><tr style="position:sticky;top:0;z-index:1">${
    cols.map(k => {
      const w = (COL_WIDTHS && COL_WIDTHS[k]) || 130;
      return `<th style="padding:8px 12px;text-align:left;background:var(--surface2);color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;min-width:${w}px">${ES_COL_LABELS[k] || k}</th>`;
    }).join('')
  }</tr></thead>`;

  const tbody = `<tbody>${rows.map((r, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    const cells = cols.map(k => {
      const val = r[k] || '';
      let cell = '';
      if (k === 'schema') {
        const color = SCHEMA_COLORS[val] || 'var(--muted)';
        cell = val ? `<span style="padding:2px 8px;background:${color}18;color:${color};border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === 'caption' || k === 'publicKey') {
        cell = val ? `<span style="font-family:monospace;font-size:11px;color:var(--yellow)">${esc(val)}</span>` : '';
      } else if (k === 'currency') {
        cell = val ? `<span style="padding:2px 8px;background:#f6c90e18;color:var(--yellow);border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === '_dataset') {
        cell = val ? `<span style="font-size:11px;color:var(--accent);font-family:monospace">${esc(val)}</span>` : '';
      } else if (k === 'sanction_sourceUrl') {
        cell = val ? `<a href="${esc(val)}" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">link</a>` : '';
      } else {
        cell = val ? `<span style="font-size:11px">${esc(String(val))}</span>` : '';
      }
      return `<td style="padding:7px 12px;border-bottom:1px solid var(--border);vertical-align:top">${cell || '<span style="color:var(--border)">—</span>'}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('')}</tbody>`;

  return thead + tbody;
}

let _cwFilterTimer = null;
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

// ── PEP view ──────────────────────────────────────────────────────────────

let _pepTab = 'datasets';

async function renderPepView(tab) {
  if (tab) _pepTab = tab;
  const content = document.getElementById('content');
  const pepDatasets = allDatasets.filter(d => (d.tags || []).includes('list.pep'));
  const totalEntities = pepDatasets.reduce((s, d) => s + (d.entity_count || 0), 0);
  const totalTargets  = pepDatasets.reduce((s, d) => s + (d.target_count || 0), 0);

  // Group by country for filter pills
  const byCountry = {};
  for (const ds of pepDatasets) {
    const c = ds.publisher_country_label || ds.publisher_country || 'Global';
    if (!byCountry[c]) byCountry[c] = 0;
    byCountry[c]++;
  }
  const countries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);

  const tabBar = `
    <div style="display:flex;gap:2px;margin-bottom:20px;border-bottom:1px solid var(--border)">
      <button onclick="renderPepView('datasets')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_pepTab==='datasets'?'var(--accent)':'transparent'};background:none;color:${_pepTab==='datasets'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_pepTab==='datasets'?'600':'400'}">Datasets</button>
      <button onclick="renderPepView('records')" style="padding:8px 18px;font-size:13px;border:none;border-bottom:2px solid ${_pepTab==='records'?'var(--accent)':'transparent'};background:none;color:${_pepTab==='records'?'var(--accent)':'var(--muted)'};cursor:pointer;font-weight:${_pepTab==='records'?'600':'400'}">Records</button>
    </div>`;

  const statStrip = `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-label">Datasets</div><div class="stat-value accent">${pepDatasets.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Entities</div><div class="stat-value green">${totalEntities.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Total Targets</div><div class="stat-value green">${totalTargets.toLocaleString()}</div></div>
      <div class="stat-card"><div class="stat-label">Countries</div><div class="stat-value">${countries.length}</div></div>
    </div>`;

  if (_pepTab === 'datasets') {
    const filterPills = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;align-items:center">
        <span style="font-size:12px;color:var(--muted);margin-right:4px">Country:</span>
        <button class="pep-filter active" data-country="all" onclick="pepFilter('all')"
          style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:var(--accent);color:#fff;font-size:12px;cursor:pointer">
          All (${pepDatasets.length})
        </button>
        ${countries.slice(0, 20).map(([c, n]) =>
          `<button class="pep-filter" data-country="${esc(c)}" onclick="pepFilter('${esc(c)}')"
            style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:12px;cursor:pointer">
            ${esc(c)} (${n})
          </button>`
        ).join('')}
      </div>`;

    const cards = pepDatasets
      .sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0))
      .map(ds => {
        const country = ds.publisher_country_label || ds.publisher_country || 'Global';
        const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
        const tags = (ds.tags || []).slice(0, 3).map(t =>
          `<span class="card-tag">${esc(t)}</span>`).join('');
        return `<div class="dataset-card" data-country="${esc(country)}" onclick="showDetail('${ds.name}')">
          <div class="card-header">
            <div>
              <div class="card-title">${esc(ds.title)}</div>
              <div class="card-name">${esc(ds.name)}</div>
            </div>
            <div class="status-dot ${statusClass}"></div>
          </div>
          ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
          <div class="card-meta">
            ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
            <div class="meta-item">${esc(country)}</div>
            ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
          </div>
          ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
        </div>`;
      }).join('');

    content.innerHTML = tabBar + statStrip + filterPills + `<div class="cards-grid" id="pep-cards">${cards}</div>`;

  } else {
    content.innerHTML = tabBar + statStrip + `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px">
        <div style="font-size:13px;color:var(--muted);margin-bottom:8px">
          PEP records total over <strong style="color:var(--text)">2.2 million</strong> entities across ${pepDatasets.length} datasets.
          Select specific datasets to load records, or search across all via Entity Search.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="switchView('entity-search')"
            style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius);font-size:12px;cursor:pointer;font-weight:600">
            Open Entity Search →
          </button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">
        ${pepDatasets.sort((a,b)=>(b.entity_count||0)-(a.entity_count||0)).map(ds => `
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
  }
}

function pepFilter(country) {
  document.querySelectorAll('.pep-filter').forEach(btn => {
    const active = btn.dataset.country === country;
    btn.style.background = active ? 'var(--accent)' : 'transparent';
    btn.style.color = active ? '#fff' : 'var(--muted)';
    btn.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
  });
  document.querySelectorAll('#pep-cards .dataset-card').forEach(card => {
    card.style.display = (country === 'all' || card.dataset.country === country) ? '' : 'none';
  });
}

async function openResourceTableForDataset(dsName) {
  const res = await fetch(`/api/dataset/${dsName}`);
  const ds = await res.json();
  const nested = (ds.resources || []).find(r => r.name === 'targets.nested.json');
  const csv = (ds.resources || []).find(r => r.name === 'targets.simple.csv');
  const resource = nested || csv;
  if (resource) openResourceTable(resource.url, resource.name + ' — ' + ds.title);
}

// ── Medicaid view ─────────────────────────────────────────────────────────

let _medicaidTab = 'datasets';
let _medicaidStateFilter = null;
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
    // State filter pills
    const statePills = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;align-items:center">
        <span style="font-size:12px;color:var(--muted);margin-right:4px">State:</span>
        <button class="med-filter active" data-state="all" onclick="medicaidFilter('all')"
          style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:var(--accent);color:#fff;font-size:12px;cursor:pointer">
          All (${medDatasets.length})
        </button>
        ${stateList.map(([state, dsList]) => {
          const n = dsList.reduce((s, d) => s + (d.entity_count||0), 0);
          return `<button class="med-filter" data-state="${esc(state)}" onclick="medicaidFilter('${esc(state)}')"
            style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:12px;cursor:pointer">
            ${esc(state)} <span style="color:var(--muted);font-size:10px">(${n.toLocaleString()})</span>
          </button>`;
        }).join('')}
      </div>`;

    const cards = medDatasets
      .sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0))
      .map(ds => {
        const m = ds.name.match(/^us_([a-z]{2})_/);
        const state = m ? (US_STATE_NAMES[m[1]] || m[1].toUpperCase()) : 'Federal';
        const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
        return `<div class="dataset-card" data-state="${esc(state)}" onclick="showDetail('${ds.name}')">
          <div class="card-header">
            <div>
              <div class="card-title">${esc(ds.title)}</div>
              <div class="card-name">${esc(ds.name)}</div>
            </div>
            <div class="status-dot ${statusClass}"></div>
          </div>
          ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
          <div class="card-meta">
            ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> excluded providers</div>` : ''}
            <div class="meta-item">${esc(state)}</div>
            ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
          </div>
        </div>`;
      }).join('');

    content.innerHTML = tabBar + statStrip + statePills + `<div class="cards-grid" id="med-cards">${cards}</div>`;

  } else {
    content.innerHTML = tabBar + statStrip + `<div id="med-records-body"><div class="loading"><div class="spinner"></div><div class="loading-text">Loading Medicaid exclusion records…</div></div></div>`;
    await loadMedicaidPage(0);
  }
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

function medicaidFilter(state) {
  document.querySelectorAll('.med-filter').forEach(btn => {
    const active = btn.dataset.state === state;
    btn.style.background = active ? 'var(--accent)' : 'transparent';
    btn.style.color = active ? '#fff' : 'var(--muted)';
    btn.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
  });
  document.querySelectorAll('#med-cards .dataset-card').forEach(card => {
    card.style.display = (state === 'all' || card.dataset.state === state) ? '' : 'none';
  });
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

function buildGenericTable(rows, cols) {
  const thead = `<thead><tr style="position:sticky;top:0;z-index:1">${
    cols.map(k => {
      const w = COL_WIDTHS[k] || 130;
      return `<th style="padding:8px 12px;text-align:left;background:var(--surface2);color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;min-width:${w}px">${ES_COL_LABELS[k] || k}</th>`;
    }).join('')
  }</tr></thead>`;
  const tbody = `<tbody>${rows.map((r, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    const cells = cols.map(k => {
      const val = r[k] || '';
      let cell = '';
      if (k === 'schema') {
        const color = SCHEMA_COLORS[val] || 'var(--muted)';
        cell = val ? `<span style="padding:2px 8px;background:${color}18;color:${color};border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === '_dataset') {
        cell = val ? `<span style="font-size:11px;color:var(--accent);font-family:monospace">${esc(val)}</span>` : '';
      } else if (k === 'id') {
        cell = val ? `<span style="font-family:monospace;font-size:10px;color:var(--muted)">${esc(val)}</span>` : '';
      } else if (k === 'first_seen' || k === 'last_seen' || k === 'last_change') {
        cell = val ? `<span style="font-size:11px;color:var(--muted)">${esc(val.slice(0,10))}</span>` : '';
      } else {
        cell = val ? `<span style="font-size:11px">${esc(String(val))}</span>` : '';
      }
      return `<td style="padding:7px 12px;border-bottom:1px solid var(--border);vertical-align:top;white-space:normal">${cell || '<span style="color:var(--border)">—</span>'}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('')}</tbody>`;
  return thead + tbody;
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

// ── Entity Search view ────────────────────────────────────────────────────

const SCHEMA_COLORS = {
  CryptoWallet: '#f6c90e', Person: '#4f8ef7', Organization: '#3ecf8e',
  Company: '#3ecf8e', LegalEntity: '#3ecf8e', Vessel: '#fb923c',
  Vehicle: '#fb923c', Sanction: '#f56565', Position: '#a78bfa',
  Address: '#64748b',
};

let _esDatasets = [];   // all available datasets for entity search
let _esSelected = null; // Set of selected dataset names
let _esSearchTimer = null;

async function renderEntitySearchView() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Loading…</div></div>`;

  if (!_esDatasets.length) {
    const res = await fetch('/api/entity-search/datasets');
    _esDatasets = await res.json();
  }
  if (!_esSelected) {
    _esSelected = new Set(_esDatasets.filter(d => d.default).map(d => d.name));
  }

  content.innerHTML = `
    <div style="display:flex;gap:0;height:calc(100vh - 65px);margin:-24px;overflow:hidden">

      <!-- Left: dataset selector -->
      <div style="width:260px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;background:var(--surface)">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Search In</div>
          <div style="position:relative">
            <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Filter datasets…" oninput="filterEsDatasets(this.value)"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px 6px 28px;font-size:12px;color:var(--text);outline:none">
          </div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button onclick="esSelectAll(true)" style="flex:1;padding:4px 0;font-size:11px;background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);cursor:pointer">All</button>
            <button onclick="esSelectAll(false)" style="flex:1;padding:4px 0;font-size:11px;background:none;border:1px solid var(--border);border-radius:5px;color:var(--muted);cursor:pointer">None</button>
            <button onclick="esSelectDefaults()" style="flex:1;padding:4px 0;font-size:11px;background:none;border:1px solid var(--border);border-radius:5px;color:var(--accent);cursor:pointer">Default</button>
          </div>
        </div>
        <div id="es-dataset-list" style="flex:1;overflow-y:auto;padding:6px 8px">
          ${renderEsDatasetList(_esDatasets)}
        </div>
      </div>

      <!-- Right: search + results -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:16px 24px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0">
          <div style="position:relative">
            <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="es-input" type="text" placeholder="Search by name, wallet address, ID, country, sanction program…"
              autofocus oninput="onEsInput(this.value)" onkeydown="if(event.key==='Enter')doEntitySearch()"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:11px 40px 11px 40px;font-size:14px;color:var(--text);outline:none;transition:border-color .15s"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
            <button id="es-clear" onclick="clearEsSearch()" style="display:none;position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;padding:4px">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--muted)">
            Searching <span id="es-ds-count" style="color:var(--text);font-weight:600">${_esSelected.size}</span> datasets · results search name, aliases, identifiers, addresses, and all fields
          </div>
        </div>
        <div id="es-results" style="flex:1;overflow-y:auto;padding:20px 24px">
          <div style="text-align:center;padding:60px 20px;color:var(--muted)">
            <div style="font-size:32px;margin-bottom:12px">🔍</div>
            <div style="font-size:14px">Enter a name, wallet address, ID, country code, or sanction program</div>
            <div style="font-size:12px;margin-top:6px">Searches within actual entity records across selected datasets</div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderEsDatasetList(datasets) {
  return datasets.map(d => `
    <label class="es-ds-row" data-name="${d.name}" style="display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:6px;cursor:pointer;transition:background .12s"
      onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
      <input type="checkbox" data-name="${d.name}" ${_esSelected.has(d.name) ? 'checked' : ''}
        onchange="toggleEsDataset('${d.name}',this.checked)"
        style="accent-color:var(--accent);flex-shrink:0;cursor:pointer">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.title)}</div>
        <div style="font-size:10px;color:var(--muted)">${d.entity_count.toLocaleString()} entities</div>
      </div>
    </label>`).join('');
}

function toggleEsDataset(name, checked) {
  if (checked) _esSelected.add(name); else _esSelected.delete(name);
  document.getElementById('es-ds-count').textContent = _esSelected.size;
}

function filterEsDatasets(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('.es-ds-row').forEach(el => {
    const matches = el.dataset.name.includes(lower) ||
      el.querySelector('div > div:first-child')?.textContent?.toLowerCase().includes(lower);
    el.style.display = matches ? '' : 'none';
  });
}

function esSelectAll(checked) {
  _esDatasets.forEach(d => { if (checked) _esSelected.add(d.name); else _esSelected.delete(d.name); });
  document.querySelectorAll('#es-dataset-list input[type=checkbox]').forEach(cb => { cb.checked = checked; });
  document.getElementById('es-ds-count').textContent = _esSelected.size;
}

function esSelectDefaults() {
  _esSelected = new Set(_esDatasets.filter(d => d.default).map(d => d.name));
  document.querySelectorAll('#es-dataset-list input[type=checkbox]').forEach(cb => {
    cb.checked = _esSelected.has(cb.dataset.name);
  });
  document.getElementById('es-ds-count').textContent = _esSelected.size;
}

function onEsInput(val) {
  document.getElementById('es-clear').style.display = val ? '' : 'none';
  clearTimeout(_esSearchTimer);
  _esSearchTimer = setTimeout(() => { if (val.trim()) doEntitySearch(); }, 350);
}

function clearEsSearch() {
  document.getElementById('es-input').value = '';
  document.getElementById('es-clear').style.display = 'none';
  document.getElementById('es-results').innerHTML = '';
}

// Priority column order — any keys found in results but not listed here appear after
const ES_COL_PRIORITY = [
  'schema','name','aliases','identifiers','birth_date','countries',
  'addresses','sanctions','phones','emails','program_ids','_dataset',
  'dataset','first_seen','last_seen','last_change','id',
];

// Human-readable labels for known keys
const ES_COL_LABELS = {
  schema:'Type', name:'Name', aliases:'Aliases', identifiers:'Identifiers',
  birth_date:'Birth Date', countries:'Countries', addresses:'Addresses',
  sanctions:'Sanctions', phones:'Phones', emails:'Emails',
  program_ids:'Program IDs', _dataset:'Dataset', dataset:'Dataset (full)',
  first_seen:'First Seen', last_seen:'Last Seen', last_change:'Last Changed', id:'ID',
};

// Min-widths for specific columns (px). Default is 120px.
const COL_WIDTHS = {
  name: 200, caption: 200, aliases: 160, alias: 160,
  address: 200, address_full: 200, addresses: 200,
  sanctions: 200, sanction_summary: 300, sanction_reason: 480,
  sanction_sourceUrl: 260, sourceUrl: 260,
  id: 260, _dataset: 160,
};

function deriveColumns(results) {
  // Collect every key present across all result rows
  const allKeys = new Set();
  results.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
  // Order: priority keys first (if present), then alphabetical remainder
  const ordered = ES_COL_PRIORITY.filter(k => allKeys.has(k));
  allKeys.forEach(k => { if (!ordered.includes(k)) ordered.push(k); });
  return ordered;
}

async function doEntitySearch() {
  const q = (document.getElementById('es-input')?.value || '').trim();
  if (!q) return;
  const resultsEl = document.getElementById('es-results');
  resultsEl.innerHTML = `<div class="loading"><div class="spinner"></div><div class="loading-text">Fetching &amp; searching datasets… (first run may take a moment)</div></div>`;

  const params = new URLSearchParams({ q, datasets: [..._esSelected].join(',') });
  const res = await fetch('/api/entity-search?' + params);
  const data = await res.json();

  if (!data.results.length) {
    resultsEl.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:12px">😶</div>
        <div>No records matching <strong style="color:var(--text)">"${esc(q)}"</strong></div>
        <div style="font-size:12px;margin-top:6px">Searched ${data.searched.length} dataset${data.searched.length !== 1 ? 's' : ''}</div>
      </div>`;
    return;
  }

  // Derive all columns present in this result set, in priority order
  const cols = deriveColumns(data.results);

  const thead = `<thead><tr style="position:sticky;top:0;z-index:1">${
    cols.map(k => {
      const w = COL_WIDTHS[k] || 120;
      return `<th style="
        padding:9px 12px;text-align:left;background:var(--surface2);
        color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;
        text-transform:uppercase;border-bottom:1px solid var(--border);
        white-space:nowrap;min-width:${w}px">${ES_COL_LABELS[k] || k}</th>`;
    }).join('')
  }</tr></thead>`;

  const tbody = `<tbody>${data.results.map((r, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    const cells = cols.map(k => {
      const val = r[k] || '';
      let cell = '';

      if (k === 'schema') {
        const color = SCHEMA_COLORS[val] || 'var(--muted)';
        cell = val ? `<span style="padding:2px 8px;background:${color}18;color:${color};border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>` : '';
      } else if (k === 'name' || k === 'identifiers') {
        cell = val ? `<span style="font-family:monospace;font-size:11px;color:var(--yellow)">${esc(val)}</span>` : '';
      } else if (k === 'sanctions') {
        cell = val.split(';').filter(Boolean).map(s =>
          `<div style="padding:1px 6px;background:#f5656514;color:var(--red);border-radius:6px;font-size:10px;white-space:nowrap;margin-bottom:2px">${esc(s.trim())}</div>`
        ).join('');
      } else if (k === 'aliases' || k === 'addresses') {
        const parts = val.split(';').filter(Boolean);
        cell = parts.map(s => `<div style="font-size:11px;color:var(--muted)">${esc(s.trim())}</div>`).join('');
      } else if (k === 'emails' || k === 'phones') {
        cell = val.split(';').filter(Boolean).map(s =>
          `<div style="font-size:11px;color:var(--text)">${esc(s.trim())}</div>`
        ).join('');
      } else if (k === '_dataset') {
        cell = val ? `<span style="font-size:11px;color:var(--accent);font-family:monospace">${esc(val)}</span>` : '';
      } else if (k === 'first_seen' || k === 'last_seen' || k === 'last_change') {
        cell = val ? `<span style="font-size:11px;color:var(--muted)">${esc(val.slice(0,10))}</span>` : '';
      } else if (k === 'id') {
        cell = val ? `<span style="font-family:monospace;font-size:10px;color:var(--muted)">${esc(val)}</span>` : '';
      } else {
        cell = val ? `<span style="font-size:12px">${esc(val)}</span>` : '';
      }

      return `<td style="padding:8px 12px;border-bottom:1px solid var(--border);vertical-align:top;white-space:normal">${cell || '<span style="color:var(--border)">—</span>'}</td>`;
    }).join('');
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('')}</tbody>`;

  const truncNote = data.total > data.results.length
    ? `<div style="font-size:12px;color:var(--yellow);padding:8px 0">⚠ Showing first 500 of ${data.total.toLocaleString()} matches — refine your query for more precise results.</div>`
    : '';

  resultsEl.style.padding = '0';
  resultsEl.innerHTML = `
    <div style="padding:14px 20px;border-bottom:1px solid var(--border);background:var(--surface);display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0">
      <span style="font-size:13px;color:var(--muted)">
        <strong style="color:var(--text)">${data.results.length.toLocaleString()}</strong> record${data.results.length !== 1 ? 's' : ''} matching
        <strong style="color:var(--accent)">"${esc(q)}"</strong>
        across <strong style="color:var(--text)">${data.searched.length}</strong> dataset${data.searched.length !== 1 ? 's' : ''}
      </span>
      ${truncNote}
    </div>
    <div style="overflow:auto;flex:1">
      <table style="width:100%;border-collapse:collapse;font-size:12px">${thead}${tbody}</table>
    </div>`;
}

// ── Country directory view ────────────────────────────────────────────────

const COUNTRY_NAMES = {
  us:'United States',eu:'European Union',gb:'United Kingdom',ru:'Russia',
  ca:'Canada',au:'Australia',de:'Germany',fr:'France',jp:'Japan',ch:'Switzerland',
  nl:'Netherlands',zz:'International',ua:'Ukraine',cn:'China',il:'Israel',
  br:'Brazil',pl:'Poland',lt:'Lithuania',tr:'Turkey',
  in:'India',kr:'South Korea',sg:'Singapore',no:'Norway',se:'Sweden',
  dk:'Denmark',fi:'Finland',be:'Belgium',at:'Austria',es:'Spain',
  it:'Italy',pt:'Portugal',ie:'Ireland',nz:'New Zealand',za:'South Africa',
  ng:'Nigeria',ke:'Kenya',gh:'Ghana',mx:'Mexico',ar:'Argentina',
  cl:'Chile',co:'Colombia',pe:'Peru',my:'Malaysia',id:'Indonesia',
  th:'Thailand',ph:'Philippines',vn:'Vietnam',pk:'Pakistan',bd:'Bangladesh',
  eg:'Egypt',ma:'Morocco',tn:'Tunisia',ge:'Georgia',am:'Armenia',
  az:'Azerbaijan',kz:'Kazakhstan',uz:'Uzbekistan',rs:'Serbia',
  ba:'Bosnia',hr:'Croatia',si:'Slovenia',sk:'Slovakia',cz:'Czechia',
  hu:'Hungary',ro:'Romania',bg:'Bulgaria',gr:'Greece',cy:'Cyprus',
  lu:'Luxembourg',mt:'Malta',ee:'Estonia',lv:'Latvia',jo:'Jordan',
  lb:'Lebanon',kw:'Kuwait',ae:'UAE',sa:'Saudi Arabia',qa:'Qatar',
  iq:'Iraq',ir:'Iran',sy:'Syria',kp:'North Korea',mm:'Myanmar',
  by:'Belarus',md:'Moldova',np:'Nepal',
};

const COUNTRY_FLAGS = {
  us:'🇺🇸',eu:'🇪🇺',gb:'🇬🇧',ru:'🇷🇺',ca:'🇨🇦',au:'🇦🇺',de:'🇩🇪',
  fr:'🇫🇷',jp:'🇯🇵',ch:'🇨🇭',nl:'🇳🇱',zz:'🌐',ua:'🇺🇦',cn:'🇨🇳',
  il:'🇮🇱',br:'🇧🇷',pl:'🇵🇱',lt:'🇱🇹',tr:'🇹🇷',in:'🇮🇳',kr:'🇰🇷',
  sg:'🇸🇬',no:'🇳🇴',se:'🇸🇪',dk:'🇩🇰',fi:'🇫🇮',be:'🇧🇪',at:'🇦🇹',
  es:'🇪🇸',it:'🇮🇹',pt:'🇵🇹',ie:'🇮🇪',nz:'🇳🇿',za:'🇿🇦',ng:'🇳🇬',
  ke:'🇰🇪',gh:'🇬🇭',mx:'🇲🇽',ar:'🇦🇷',cl:'🇨🇱',co:'🇨🇴',pe:'🇵🇪',
  my:'🇲🇾',id:'🇮🇩',th:'🇹🇭',ph:'🇵🇭',vn:'🇻🇳',pk:'🇵🇰',bd:'🇧🇩',
  eg:'🇪🇬',ma:'🇲🇦',tn:'🇹🇳',ge:'🇬🇪',am:'🇦🇲',az:'🇦🇿',kz:'🇰🇿',
  uz:'🇺🇿',rs:'🇷🇸',ba:'🇧🇦',hr:'🇭🇷',si:'🇸🇮',sk:'🇸🇰',cz:'🇨🇿',
  hu:'🇭🇺',ro:'🇷🇴',bg:'🇧🇬',gr:'🇬🇷',cy:'🇨🇾',lu:'🇱🇺',mt:'🇲🇹',
  ee:'🇪🇪',lv:'🇱🇻',jo:'🇯🇴',lb:'🇱🇧',kw:'🇰🇼',ae:'🇦🇪',sa:'🇸🇦',
  qa:'🇶🇦',iq:'🇮🇶',ir:'🇮🇷',sy:'🇸🇾',kp:'🇰🇵',mm:'🇲🇲',by:'🇧🇾',
  md:'🇲🇩',np:'🇳🇵',
};

let _selectedCountry = null;
let _usFilter = null; // null | 'medicaid' | 'state:XX'

function _usStateCode(ds) {
  const m = ds.name.match(/^us_([a-z]{2})_/);
  return (m && US_STATE_NAMES[m[1]]) ? m[1] : null;
}

function _isMedicaid(ds) {
  return (ds.tags || []).some(t => t === 'sector.usmed.debarment' || t === 'sector.medical') ||
    ds.name.includes('_med_exclusions') || ds.name === 'us_hhs_exclusions' ||
    ds.name === 'us_dc_exclusions';
}

function setUsFilter(f) {
  if (f === null || f === 'null') { _usFilter = null; }
  else _usFilter = (_usFilter === f) ? null : f; // toggle off if already active
  const countries = buildCountryIndex();
  document.getElementById('country-datasets-panel').innerHTML =
    renderCountryDatasets(countries.find(c => c.code === 'us'));
}

function buildCountryIndex() {
  const index = {};  // code -> { label, flag, datasets[] }
  for (const ds of allDatasets) {
    const code = ds.publisher_country || 'zz';
    const label = ds.publisher_country_label || COUNTRY_NAMES[code] || code.toUpperCase();
    if (!index[code]) index[code] = { code, label, flag: COUNTRY_FLAGS[code] || '🏳', datasets: [] };
    index[code].datasets.push(ds);
  }
  return Object.values(index).sort((a, b) => b.datasets.length - a.datasets.length);
}

function renderCountryView(selectCode) {
  const countries = buildCountryIndex();
  _selectedCountry = selectCode || (_selectedCountry && countries.find(c => c.code === _selectedCountry)?.code) || countries[0]?.code;

  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="display:flex;gap:0;height:calc(100vh - 65px);margin:-24px;overflow:hidden">

      <!-- Country list (left panel) -->
      <div style="width:260px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--surface)">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:1">
          <div style="position:relative">
            <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted)" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="country-search" type="text" placeholder="Filter countries…" oninput="filterCountries(this.value)"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px 6px 28px;font-size:12px;color:var(--text);outline:none">
          </div>
        </div>
        <div id="country-list">
          ${countries.map(c => renderCountryRow(c, c.code === _selectedCountry)).join('')}
        </div>
      </div>

      <!-- Dataset list (right panel) -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:12px 20px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0">
          <div style="position:relative">
            <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="dataset-search" type="text" placeholder="Search all datasets…" oninput="searchAllDatasets(this.value)"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px 32px 8px 34px;font-size:13px;color:var(--text);outline:none;transition:border-color .15s"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
            <button id="dataset-search-clear" onclick="clearDatasetSearch()" style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);cursor:pointer;padding:2px;line-height:1">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:20px 24px" id="country-datasets-panel">
          ${renderCountryDatasets(countries.find(c => c.code === _selectedCountry))}
        </div>
      </div>
    </div>`;
}

function renderCountryRow(c, active) {
  const totalEntities = c.datasets.reduce((s, d) => s + (d.entity_count || 0), 0);
  const bg = active ? 'var(--surface2)' : 'transparent';
  const border = active ? 'border-left:3px solid var(--accent)' : 'border-left:3px solid transparent';
  return `<div class="country-row" data-code="${c.code}" onclick="selectCountry('${c.code}')"
    style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:${bg};${border};transition:all .12s">
    <span style="font-size:18px;line-height:1;flex-shrink:0">${c.flag}</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;color:${active ? 'var(--text)' : 'var(--muted)'};font-weight:${active ? '600' : '400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${esc(c.label)}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">
        ${c.datasets.length} dataset${c.datasets.length !== 1 ? 's' : ''}
        · ${fmtNum(totalEntities)} entities
      </div>
    </div>
  </div>`;
}

function renderCountryDatasets(country) {
  if (!country) return '';
  const totalEntities = country.datasets.reduce((s, d) => s + (d.entity_count || 0), 0);
  const totalTargets  = country.datasets.reduce((s, d) => s + (d.target_count || 0), 0);

  // US-specific filter bar
  let filterBar = '';
  let visibleDatasets = country.datasets;
  if (country.code === 'us') {
    // Collect states present in this dataset list
    const stateCodes = [...new Set(country.datasets.map(_usStateCode).filter(Boolean))].sort();

    // Apply active filter
    if (_usFilter === 'medicaid') {
      visibleDatasets = country.datasets.filter(_isMedicaid);
    } else if (_usFilter && _usFilter.startsWith('state:')) {
      const code = _usFilter.slice(6);
      visibleDatasets = country.datasets.filter(ds => _usStateCode(ds) === code);
    }

    const pill = (label, value, color) => {
      const active = _usFilter === value;
      return `<button onclick="setUsFilter('${value}')" style="
        padding:4px 12px;border-radius:20px;border:1px solid ${active ? color : 'var(--border)'};
        background:${active ? color + '22' : 'transparent'};color:${active ? color : 'var(--muted)'};
        font-size:12px;cursor:pointer;white-space:nowrap;transition:all .15s">${label}</button>`;
    };

    const stateOptions = stateCodes.map(c =>
      `<option value="state:${c}" ${_usFilter === 'state:' + c ? 'selected' : ''}>${US_STATE_NAMES[c]}</option>`
    ).join('');

    filterBar = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--muted);flex-shrink:0">Filter:</span>
        ${pill('Medicaid / Medical', 'medicaid', 'var(--green)')}
        <select onchange="setUsFilter(this.value === '' ? null : this.value);this.blur()"
          style="background:var(--bg);border:1px solid ${_usFilter && _usFilter.startsWith('state:') ? 'var(--accent)' : 'var(--border)'};
          border-radius:20px;padding:4px 10px;font-size:12px;color:${_usFilter && _usFilter.startsWith('state:') ? 'var(--accent)' : 'var(--muted)'};
          cursor:pointer;outline:none">
          <option value="" ${!_usFilter || !_usFilter.startsWith('state:') ? 'selected' : ''}>By State…</option>
          ${stateOptions}
        </select>
        ${_usFilter ? `<button onclick="setUsFilter(null)" style="padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:12px;cursor:pointer">✕ Clear</button>` : ''}
        <span style="font-size:11px;color:var(--muted);margin-left:4px">${visibleDatasets.length} of ${country.datasets.length} datasets</span>
      </div>`;
  }

  const rows = visibleDatasets
    .sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0))
    .map(ds => {
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
          ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
          ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
          ${ds.updated_at ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
          ${ds.frequency  ? `<div class="meta-item">${ds.frequency}</div>` : ''}
        </div>
        ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
      </div>`;
    }).join('');

  return `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">
      <span style="font-size:28px">${country.flag}</span>
      <div>
        <div style="font-size:18px;font-weight:700">${esc(country.label)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">
          ${country.datasets.length} datasets · ${fmtNum(totalEntities)} entities · ${fmtNum(totalTargets)} targets
        </div>
      </div>
    </div>
    ${filterBar}
    ${rows}`;
}

function selectCountry(code) {
  _selectedCountry = code;
  if (code !== 'us') _usFilter = null;
  // Clear search
  const searchEl = document.getElementById('dataset-search');
  if (searchEl) { searchEl.value = ''; }
  const clearBtn = document.getElementById('dataset-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  // Update left panel highlights without full re-render
  document.querySelectorAll('.country-row').forEach(el => {
    const active = el.dataset.code === code;
    el.style.background = active ? 'var(--surface2)' : 'transparent';
    el.style.borderLeft = active ? '3px solid var(--accent)' : '3px solid transparent';
    const name = el.querySelector('div > div:first-child');
    if (name) { name.style.color = active ? 'var(--text)' : 'var(--muted)'; name.style.fontWeight = active ? '600' : '400'; }
  });
  const countries = buildCountryIndex();
  document.getElementById('country-datasets-panel').innerHTML =
    renderCountryDatasets(countries.find(c => c.code === code));
}

let _countrySearchTimer = null;

function searchAllDatasets(q) {
  const clearBtn = document.getElementById('dataset-search-clear');
  if (clearBtn) clearBtn.style.display = q ? '' : 'none';
  clearTimeout(_countrySearchTimer);
  _countrySearchTimer = setTimeout(() => {
    if (!q.trim()) {
      const countries = buildCountryIndex();
      document.getElementById('country-datasets-panel').innerHTML =
        renderCountryDatasets(countries.find(c => c.code === _selectedCountry));
      return;
    }
    const lower = q.toLowerCase();
    const matches = allDatasets.filter(ds => {
      return [ds.name, ds.title, ds.summary, ds.description,
              ds.publisher_name, ds.publisher_country_label,
              ...(ds.tags || [])].some(v => v && v.toLowerCase().includes(lower));
    });
    renderSearchResults(matches, q);
  }, 180);
}

function renderSearchResults(matches, q) {
  const panel = document.getElementById('country-datasets-panel');
  if (!matches.length) {
    panel.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div><div>No datasets match "${esc(q)}"</div></div>`;
    return;
  }
  const cards = matches
    .sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0))
    .map(ds => {
      const code = ds.publisher_country || 'zz';
      const flag = COUNTRY_FLAGS[code] || '🏳';
      const countryLabel = ds.publisher_country_label || COUNTRY_NAMES[code] || code.toUpperCase();
      const statusClass = ds.result === 'success' ? 'success' : ds.result ? 'error' : 'unknown';
      const tags = (ds.tags || []).slice(0, 3).map(t =>
        `<span style="padding:2px 7px;background:var(--tag-bg);color:var(--tag-text);border-radius:10px;font-size:10px">${esc(t)}</span>`
      ).join(' ');
      return `<div class="dataset-card" style="margin-bottom:10px" onclick="showDetail('${ds.name}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px">
            <span>${flag}</span> ${esc(countryLabel)}
          </span>
          <div class="status-dot ${statusClass}"></div>
        </div>
        <div class="card-title">${esc(ds.title)}</div>
        <div class="card-name" style="margin-top:2px;margin-bottom:8px">${esc(ds.name)}</div>
        ${ds.summary ? `<div class="card-summary">${esc(ds.summary)}</div>` : ''}
        <div class="card-meta">
          ${ds.entity_count ? `<div class="meta-item"><strong>${ds.entity_count.toLocaleString()}</strong> entities</div>` : ''}
          ${ds.target_count ? `<div class="meta-item"><strong>${ds.target_count.toLocaleString()}</strong> targets</div>` : ''}
          ${ds.updated_at   ? `<div class="meta-item">${ds.updated_at}</div>` : ''}
        </div>
        ${tags ? `<div class="card-tags" style="margin-top:8px">${tags}</div>` : ''}
      </div>`;
    }).join('');

  panel.innerHTML = `
    <div style="margin-bottom:16px;font-size:13px;color:var(--muted)">
      <strong style="color:var(--text)">${matches.length.toLocaleString()}</strong> datasets matching <strong style="color:var(--accent)">"${esc(q)}"</strong>
    </div>
    ${cards}`;
}

function clearDatasetSearch() {
  const searchEl = document.getElementById('dataset-search');
  if (searchEl) searchEl.value = '';
  const clearBtn = document.getElementById('dataset-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  const countries = buildCountryIndex();
  document.getElementById('country-datasets-panel').innerHTML =
    renderCountryDatasets(countries.find(c => c.code === _selectedCountry));
}

function filterCountries(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('.country-row').forEach(el => {
    const label = el.querySelector('div > div:first-child')?.textContent?.toLowerCase() || '';
    el.style.display = label.includes(lower) ? '' : 'none';
  });
}

function fmtNum(n) {
  return n ? n.toLocaleString() : '0';
}

// ── Tags view ─────────────────────────────────────────────────────────────

async function renderTagsView() {
  const content = document.getElementById('content');
  let tags;
  if (_tagsMeta) {
    tags = _tagsMeta;
  } else {
    content.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const res = await fetch('/api/tags');
    tags = await res.json();
    _tagsMeta = tags;
  }

  const pills = tags.map(([t, n]) =>
    `<span class="tag-pill" style="font-size:13px;padding:6px 14px" onclick="filterByTag(null,'${t}')">${t} <span class="tag-count">${n}</span></span>`
  ).join('');

  content.innerHTML = `
    <div class="results-header">
      <div class="results-count">${tags.length} unique tags across all datasets</div>
    </div>
    <div class="tags-section" style="margin-bottom:0">
      <div class="tags-cloud">${pills}</div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function filterByTag(e, tag) {
  if (e) e.stopPropagation();
  switchView('datasets');
  document.getElementById('filter-select').value = 'tag';
  document.getElementById('search-input').value = tag;
  doSearch(tag);
}

async function refreshData() {
  showNotif('Refreshing data…');
  // Clear server-side caches
  await fetch('/api/refresh');
  // Clear client-side caches
  _statsMeta = null;
  _tagsMeta  = null;
  _cyberMeta = null;
  window._medRecordsData = null;
  window._cyberRecordsData = null;
  window.cryptoWalletData = null;
  await loadDatasets();
  showNotif('Data refreshed ✓');
  if (currentView === 'datasets') renderDatasetsView();
  else if (currentView === 'stats') renderStatsView();
}

function showNotif(msg) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('table-overlay').style.display !== 'none') closeResourceTable();
    else closeDetailPanel();
  }
});

// ── Resource table viewer ─────────────────────────────────────────────────

let _tableData = [];         // full flat records
let _tableCols = [];         // ordered column keys
let _tableSearchTimer = null;

const COL_LABELS = {
  caption: 'Address / Name', schema: 'Schema', publicKey: 'Public Key',
  currency: 'Currency', managingExchange: 'Exchange', accountId: 'Account ID',
  holder: 'Holder', holder_alias: 'Holder Alias', topics: 'Topics',
  sanction_authority: 'Authority', sanction_id: 'Order ID',
  sanction_country: 'Country', sanction_start: 'Start Date',
  sanction_end: 'End Date', first_seen: 'First Seen',
  last_seen: 'Last Seen', last_change: 'Last Change', id: 'Record ID',
  name: 'Name', alias: 'Alias', nationality: 'Nationality',
  address: 'Address', birthDate: 'Birth Date', country: 'Country',
};

async function openResourceTable(url, filename) {
  const overlay = document.getElementById('table-overlay');
  overlay.style.display = 'flex';
  document.getElementById('table-title').textContent = filename;
  document.getElementById('table-count').textContent = '';
  document.getElementById('table-search').value = '';
  document.getElementById('table-dl-link').href = url;
  document.getElementById('table-loading').style.display = 'flex';
  document.getElementById('table-wrap').style.display = 'none';

  const res = await fetch('/api/fetch-resource?url=' + encodeURIComponent(url));
  const data = await res.json();

  _tableData = data.records || [];
  _tableCols = data.columns || [];

  document.getElementById('table-loading').style.display = 'none';
  document.getElementById('table-wrap').style.display = 'block';
  document.getElementById('table-count').textContent =
    `${_tableData.length.toLocaleString()} of ${(data.total||_tableData.length).toLocaleString()} records`;

  buildTable(_tableData);
}

function buildTable(rows) {
  // Header
  const thead = document.getElementById('resource-thead');
  thead.innerHTML = `<tr>${_tableCols.map(k => `
    <th onclick="sortTable('${k}')" style="
      padding:9px 12px;text-align:left;background:var(--surface2);
      color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.5px;
      text-transform:uppercase;border-bottom:1px solid var(--border);
      white-space:nowrap;cursor:pointer;user-select:none" data-col="${k}">
      ${COL_LABELS[k] || k}
      <span class="sort-icon" style="color:var(--border);margin-left:4px">⇅</span>
    </th>`).join('')}</tr>`;

  renderRows(rows);
}

function renderRows(rows) {
  const tbody = document.getElementById('resource-tbody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${_tableCols.length}"
      style="text-align:center;padding:40px;color:var(--muted)">No matching records</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const bg = i % 2 === 0 ? 'var(--bg)' : 'var(--surface)';
    return `<tr style="background:${bg}">
      ${_tableCols.map(k => {
        const val = row[k] != null ? String(row[k]) : '';
        const isKey = k === 'publicKey' || k === 'caption';
        const isUrl = val.startsWith('http');
        const isTopic = k === 'topics';

        let cell = esc(val);
        if (!val) cell = `<span style="color:var(--border)">—</span>`;
        else if (isUrl) cell = `<a href="${esc(val)}" target="_blank" style="color:var(--accent);text-decoration:none">${esc(val.split('/').pop())}</a>`;
        else if (isKey && val.length > 20) cell = `<span style="font-family:monospace;font-size:11px;color:var(--yellow)">${esc(val)}</span>`;
        else if (isTopic && val) cell = val.split(', ').map(t =>
          `<span style="padding:2px 7px;background:var(--tag-bg);color:var(--tag-text);border-radius:10px;font-size:10px;white-space:nowrap">${esc(t)}</span>`
        ).join(' ');
        else if ((k === 'currency') && val) cell = `<span style="padding:2px 8px;background:#f6c90e18;color:var(--yellow);border-radius:10px;font-size:11px;font-weight:600">${esc(val)}</span>`;

        return `<td onclick="toggleCell(this)" title="${esc(val)}"
          style="padding:8px 12px;border-bottom:1px solid var(--border);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:top;cursor:pointer;transition:background .1s"
          onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">${cell}</td>`;
      }).join('')}
    </tr>`;
  }).join('');
}

function toggleCell(td) {
  const expanded = td.dataset.expanded === '1';
  if (expanded) {
    td.style.maxWidth = '240px';
    td.style.overflow = 'hidden';
    td.style.textOverflow = 'ellipsis';
    td.style.whiteSpace = 'nowrap';
    td.style.wordBreak = '';
    td.style.background = '';
    td.dataset.expanded = '';
  } else {
    td.style.maxWidth = '520px';
    td.style.overflow = 'visible';
    td.style.textOverflow = 'clip';
    td.style.whiteSpace = 'pre-wrap';
    td.style.wordBreak = 'break-word';
    td.style.background = 'var(--surface2)';
    td.dataset.expanded = '1';
  }
}

let _sortCol = null;
let _sortAsc = true;

function sortTable(col) {
  if (_sortCol === col) _sortAsc = !_sortAsc;
  else { _sortCol = col; _sortAsc = true; }

  // Update sort icons
  document.querySelectorAll('#resource-thead th').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (th.dataset.col === col) {
      icon.textContent = _sortAsc ? '↑' : '↓';
      icon.style.color = 'var(--accent)';
    } else {
      icon.textContent = '⇅';
      icon.style.color = 'var(--border)';
    }
  });

  const q = document.getElementById('table-search').value.toLowerCase();
  const filtered = q ? _tableData.filter(r => rowMatchesSearch(r, q)) : _tableData;
  const sorted = [...filtered].sort((a, b) => {
    const va = String(a[col] ?? '');
    const vb = String(b[col] ?? '');
    return _sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  renderRows(sorted);
}

function filterTableRows(q) {
  clearTimeout(_tableSearchTimer);
  _tableSearchTimer = setTimeout(() => {
    const lower = q.toLowerCase().trim();
    _sortCol = null;
    const filtered = lower
      ? _tableData.filter(r => rowMatchesSearch(r, lower))
      : _tableData;
    document.getElementById('table-count').textContent =
      `${filtered.length.toLocaleString()} of ${_tableData.length.toLocaleString()} records`;
    renderRows(filtered);
  }, 200);
}

function rowMatchesSearch(row, q) {
  return Object.values(row).some(v => v != null && String(v).toLowerCase().includes(q));
}

function closeResourceTable() {
  document.getElementById('table-overlay').style.display = 'none';
  _tableData = [];
  _tableCols = [];
}

init();
