function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtNum(n) {
  return n ? n.toLocaleString() : '0';
}

function showNotif(msg) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

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

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('table-overlay').style.display !== 'none') closeResourceTable();
    else closeDetailPanel();
  }
});
