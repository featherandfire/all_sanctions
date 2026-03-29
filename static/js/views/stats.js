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
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
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

  const countryBarData = s.top_countries.map(([c, n]) => ({ label: c.toUpperCase(), value: n }));

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
        <div id="bar-countries"></div>
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
        <div class="chart-title">Medicaid Offense Rate <span style="font-size:10px;color:var(--muted);font-weight:400">percentage
        </span></div>
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

  drawPieChart('pie-medicaid', medicaidPieData, null, { colorMap: STATE_COLOR_MAP });

  // Cyber by country — entity-level scan across all crypto datasets (async, slow on first load)
  const CYBER_PIE_COLORS = ['#f6c90e','#f56565','#a78bfa','#4f8ef7','#3ecf8e','#fb923c','#64748b','#e879f9','#34d399','#60a5fa','#f97316','#94a3b8'];
  if (_statsMeta.cyberCountryData) {
    drawPieChart('pie-cyber', _statsMeta.cyberCountryData.slice(0, 10), CYBER_PIE_COLORS);
  } else {
    fetch('/api/stats/crypto-by-country').then(r => r.json()).then(cyberCountryData => {
      _statsMeta.cyberCountryData = cyberCountryData;
      const el = document.getElementById('pie-cyber');
      if (!el) return;
      el.innerHTML = '';
      drawPieChart('pie-cyber', cyberCountryData.slice(0, 10), CYBER_PIE_COLORS);
    });
  }

  // Publisher countries vertical bar chart
  drawBarChart('bar-countries', countryBarData, '#3ecf8e');

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
  if (_statsMeta.popData) {
    drawPieChart('pie-population', _statsMeta.popData.slice(0, 10), null, { colorMap: STATE_COLOR_MAP });
    _drawMedicaidRateChart();
  } else {
    fetch('/api/stats/population-by-state').then(r => r.json()).then(popData => {
      _statsMeta.popData = popData;
      const popEl = document.getElementById('pie-population');
      if (popEl) { popEl.innerHTML = ''; drawPieChart('pie-population', popData.slice(0, 10), null, { colorMap: STATE_COLOR_MAP }); }
      _drawMedicaidRateChart();
    });
  }
}
