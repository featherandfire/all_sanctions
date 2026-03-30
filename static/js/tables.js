// ── Shared record table builder ────────────────────────────────────────────
function _buildRecordRows(rows, cols) {
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
      } else if (k === 'sanction_sourceUrl') {
        cell = val ? `<a href="${esc(val)}" target="_blank" style="font-size:11px;color:var(--accent);text-decoration:none">link</a>` : '';
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

function buildGenericTable(rows, cols)      { return _buildRecordRows(rows, cols); }
function buildCyberRecordsTable(rows, cols) { return _buildRecordRows(rows, cols); }
function buildCryptoTable(rows, cols)       { return _buildRecordRows(rows, cols); }

// ── Resource table viewer ─────────────────────────────────────────────────

let _tableData = [];         // full flat records
let _tableCols = [];         // ordered column keys
let _tableSearchTimer = null;
let _sortCol = null;
let _sortAsc = true;

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
