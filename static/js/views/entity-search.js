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
