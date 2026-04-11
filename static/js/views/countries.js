let _selectedCountry = null;
let _usFilter = null; // null | 'medicaid' | 'state:XX'
let _countrySearchTimer = null;

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
    <div class="home-banner-wrap home-banner-wrap--sm"><canvas id="countries-banner-canvas"></canvas></div>
    <div style="display:flex;gap:0;height:calc(100vh - 65px - 40px);margin:0 -24px -24px -24px;overflow:hidden">

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
  BannerAnimation.init(document.getElementById('countries-banner-canvas'));
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
