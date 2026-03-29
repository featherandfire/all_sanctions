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

function setLayout(layout) {
  currentLayout = layout;
  document.getElementById('grid-btn').classList.toggle('active', layout === 'grid');
  document.getElementById('list-btn').classList.toggle('active', layout === 'list');
  const q = document.getElementById('search-input').value;
  if (q.trim()) doSearch(q);
  else renderDatasetsView(allDatasets);
}

function jumpToDataset(name) {
  switchView('datasets');
  document.getElementById('search-input').value = name;
  doSearch(name);
  setTimeout(() => showDetail(name), 400);
}

async function openResourceTableForDataset(dsName) {
  const res = await fetch(`/api/dataset/${dsName}`);
  const ds = await res.json();
  const nested = (ds.resources || []).find(r => r.name === 'targets.nested.json');
  const csv = (ds.resources || []).find(r => r.name === 'targets.simple.csv');
  const resource = nested || csv;
  if (resource) openResourceTable(resource.url, resource.name + ' — ' + ds.title);
}
