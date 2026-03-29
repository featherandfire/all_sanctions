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
