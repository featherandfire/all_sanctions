let allDatasets = [];
let currentView = 'home';
let currentLayout = 'grid';
let searchTimer = null;

// View-level API response caches — avoids re-fetching on tab revisit
let _statsMeta = null;
let _tagsMeta  = null;

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  renderHomeView();      // paint immediately — home page needs no API data
  await loadDatasets();  // fetch dataset index in background for other views
}

async function loadDatasets() {
  const res = await fetch('/api/datasets');
  allDatasets = await res.json();
}

// ── Mobile sidebar ────────────────────────────────────────────────────────

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const open = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', open);
}

function _closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('show');
}

// ── View switching ────────────────────────────────────────────────────────

function switchView(view) {
  _closeSidebar();
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const titles = { home: 'Home', datasets: 'Browse Datasets', stats: 'Statistics', cyber: 'Cyber & Crypto', pep: 'Politically Exposed Persons', medicaid: 'Medicaid Exclusions', 'entity-search': 'Entity Search', countries: 'By Country', tags: 'Tags' };
  document.getElementById('page-title').textContent = titles[view];
  const isDatasets = view === 'datasets';
  document.getElementById('search-wrap').style.display = isDatasets ? '' : 'none';
  document.getElementById('filter-select').style.display = isDatasets ? '' : 'none';
  document.getElementById('view-toggle').style.display = isDatasets ? '' : 'none';

  if (view === 'home') renderHomeView();
  else if (view === 'datasets') renderDatasetsView();
  else if (view === 'stats') renderStatsView();
  else if (view === 'cyber') renderCyberView();
  else if (view === 'pep') renderPepView();
  else if (view === 'medicaid') renderMedicaidView();
  else if (view === 'entity-search') renderEntitySearchView();
  else if (view === 'countries') renderCountryView();
  else if (view === 'tags') renderTagsView();
}

init();
