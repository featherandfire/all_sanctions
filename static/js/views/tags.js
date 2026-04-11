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
    <div class="home-banner-wrap home-banner-wrap--sm"><canvas id="tags-banner-canvas"></canvas></div>
    <div id="tags-body">
    <div class="results-header">
      <div class="results-count">${tags.length} unique tags across all datasets</div>
    </div>
    <div class="tags-section" style="margin-bottom:0">
      <div class="tags-cloud">${pills}</div>
    </div>
    </div>
  `;
  BannerAnimation.init(document.getElementById('tags-banner-canvas'));
}
