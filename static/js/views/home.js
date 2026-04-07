/**
 * Home / landing view — feature cards with descriptions for each tool.
 */

const HOME_FEATURES = [
  {
    view: 'datasets',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    title: 'Browse Datasets',
    color: 'var(--accent)',
    summary: 'Explore the full OpenSanctions dataset catalog.',
    description: 'Browse, filter, and search across every international sanctions list — OFAC SDN, UN Security Council, EU, UK, and 40+ more. View entity counts, update frequencies, publisher details, and download raw data files.',
    tags: ['OFAC', 'UN', 'EU', 'UK HMT', 'FCDO', 'SECO'],
  },
  {
    view: 'stats',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    title: 'Visual Statistics',
    color: 'var(--green)',
    summary: 'Charts and breakdowns across all sanctions data.',
    description: 'Interactive visualisations showing entity counts by dataset, publishing country, sanction type, and coverage trends. Includes stacked bar charts for the top sanctioned sectors per country.',
    tags: ['Charts', 'Heatmaps', 'Trends', 'Country Breakdown'],
  },
  {
    view: 'cyber',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: 'Cyber & Crypto',
    color: '#a78bfa',
    summary: 'Blockchain address screening and wallet forensics.',
    description: 'Look up any Ethereum wallet address against OFAC SDN, FBI Lazarus, and other crypto sanctions lists. View live ETH balance, transaction history, token transfers, and an interactive address-flow graph. Tracks your investigation trail across sessions.',
    tags: ['Ethereum', 'OFAC SDN', 'FBI Lazarus', 'Ransomwhere', 'Wallet Forensics'],
  },
  {
    view: 'pep',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    title: 'Politically Exposed Persons',
    color: 'var(--yellow)',
    summary: 'Search PEP databases for high-risk individuals.',
    description: 'Query politically exposed persons datasets from multiple jurisdictions. Identify current and former government officials, their associates, and family members flagged across international watchlists.',
    tags: ['PEP', 'Government Officials', 'High-Risk Individuals'],
  },
  {
    view: 'medicaid',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    title: 'Medicaid Exclusions',
    color: 'var(--red)',
    summary: 'HHS OIG excluded providers and entities.',
    description: 'Search the U.S. Department of Health & Human Services Office of Inspector General exclusion list. Identify individuals and organizations barred from participation in federal healthcare programs.',
    tags: ['HHS OIG', 'Healthcare Fraud', 'Provider Exclusions'],
  },
  {
    view: 'entity-search',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    title: 'Entity Search',
    color: 'var(--accent)',
    summary: 'Cross-list entity name and identifier lookup.',
    description: 'Search by name, alias, ID number, or country across all loaded sanctions datasets simultaneously. Supports fuzzy matching and returns full sanction records with authority, program, listing date, and source URLs.',
    tags: ['Name Search', 'Alias', 'Cross-List', 'Fuzzy Match'],
  },
  {
    view: 'countries',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    title: 'Search by Country',
    color: 'var(--green)',
    summary: 'Filter all sanctions entities by nationality or jurisdiction.',
    description: 'Select any country to see every sanctioned individual and entity associated with that jurisdiction across all active datasets. Useful for country-risk assessments and geographic exposure analysis.',
    tags: ['Country Risk', 'Jurisdiction', 'Geographic Filter'],
  },
  {
    view: 'tags',
    icon: `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    title: 'Tags',
    color: 'var(--accent2)',
    summary: 'Browse datasets grouped by topic or category tag.',
    description: 'Explore the dataset catalog through curated topic tags — sanctions, debarment, crime, terrorism, proliferation, and more. Click any tag to see all datasets sharing that classification.',
    tags: ['Terrorism', 'Proliferation', 'Debarment', 'Crime'],
  },
];

function renderHomeView() {
  const content = document.getElementById('content');

  const cards = HOME_FEATURES.map(f => {
    const tagPills = f.tags.map(t =>
      `<span style="
        display:inline-block;
        padding:2px 8px;
        background:var(--surface2);
        border:1px solid var(--border);
        border-radius:12px;
        font-size:10px;
        color:var(--muted);
        margin:2px 2px 0 0;
      ">${t}</span>`
    ).join('');

    return `
      <div class="home-card" onclick="switchView('${f.view}')" style="
        background:var(--surface);
        border:1px solid var(--border);
        border-radius:12px;
        padding:24px;
        cursor:pointer;
        transition:border-color .15s, transform .15s, box-shadow .15s;
        display:flex;
        flex-direction:column;
        gap:14px;
        position:relative;
        overflow:hidden;
      "
      onmouseenter="this.style.borderColor='${f.color}';this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.4)'"
      onmouseleave="this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow=''">

        <!-- colour accent bar -->
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${f.color};opacity:.7;border-radius:12px 12px 0 0"></div>

        <div style="display:flex;align-items:flex-start;gap:14px">
          <div style="color:${f.color};flex-shrink:0;margin-top:2px">${f.icon}</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">${f.title}</div>
            <div style="font-size:12px;color:var(--muted)">${f.summary}</div>
          </div>
        </div>

        <div style="font-size:12px;color:var(--text);opacity:.75;line-height:1.6">${f.description}</div>

        <div style="margin-top:auto">${tagPills}</div>

        <div style="
          display:flex;
          align-items:center;
          gap:5px;
          font-size:12px;
          color:${f.color};
          font-weight:600;
          margin-top:4px;
        ">
          Open
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <div style="max-width:1100px;margin:0 auto">

      <!-- Hero -->
      <div style="
        text-align:center;
        padding:48px 24px 40px;
        margin-bottom:32px;
      ">
        <div style="
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:5px 14px;
          background:rgba(79,142,247,.12);
          border:1px solid rgba(79,142,247,.3);
          border-radius:20px;
          font-size:11px;
          color:var(--accent);
          font-weight:600;
          letter-spacing:.6px;
          text-transform:uppercase;
          margin-bottom:20px;
        ">
          <svg width="11" height="11" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>
          Sanctions Intelligence Platform
        </div>

        <h1 style="
          font-size:clamp(26px,4vw,42px);
          font-weight:800;
          color:var(--text);
          line-height:1.15;
          margin-bottom:16px;
          letter-spacing:-.5px;
        ">International Sanctions Explorer</h1>

        <p style="
          font-size:15px;
          color:var(--muted);
          max-width:580px;
          margin:0 auto 28px;
          line-height:1.65;
        ">
          A unified interface for screening individuals, entities, and crypto wallets
          against 40+ global sanctions, watchlist, and exclusion datasets.
        </p>

        <!-- Quick-nav pills -->
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">
          ${HOME_FEATURES.map(f => `
            <button onclick="switchView('${f.view}')" style="
              padding:7px 16px;
              background:var(--surface);
              border:1px solid var(--border);
              border-radius:20px;
              font-size:12px;
              color:var(--muted);
              cursor:pointer;
              transition:all .15s;
              font-family:inherit;
            "
            onmouseenter="this.style.color='${f.color}';this.style.borderColor='${f.color}'"
            onmouseleave="this.style.color='var(--muted)';this.style.borderColor='var(--border)'"
            >${f.title}</button>
          `).join('')}
        </div>
      </div>

      <!-- Feature cards grid -->
      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
        gap:16px;
        padding-bottom:40px;
      ">
        ${cards}
      </div>

    </div>`;
}
