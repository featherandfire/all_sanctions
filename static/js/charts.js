function _ensureTooltip(id, cssText) {
  let tip = document.getElementById(id);
  if (!tip) {
    tip = document.createElement('div');
    tip.id = id;
    tip.style.cssText = cssText;
    document.body.appendChild(tip);
  }
  return tip;
}

function drawBarChart(containerId, data, color) {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const margin = { top: 16, right: 16, bottom: 72, left: 56 };
  const totalW = container.clientWidth || 480;
  const totalH = 280;
  const w = totalW - margin.left - margin.right;
  const h = totalH - margin.top - margin.bottom;

  const svg = d3.select(`#${containerId}`).append('svg')
    .attr('width', totalW).attr('height', totalH)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.28);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.08]).nice().range([h, 0]);

  // Grid lines
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
    .selectAll('line').style('stroke', '#2a2f3d').style('stroke-dasharray', '3,3');
  svg.select('.domain').remove();

  // Y axis
  svg.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(n => n >= 1000 ? (n/1000).toFixed(0)+'k' : n))
    .selectAll('text').style('fill', '#64748b').style('font-size', '11px');
  svg.selectAll('.tick line').style('display', 'none');

  // X axis
  svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
    .selectAll('text')
    .style('fill', '#64748b').style('font-size', '11px')
    .attr('transform', 'rotate(-38)').style('text-anchor', 'end');
  svg.select('.domain').style('stroke', '#2a2f3d');

  // Tooltip
  const tip = _ensureTooltip('bar-tooltip', 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:7px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none');

  // Bars
  svg.selectAll('.bar').data(data).enter().append('rect')
    .attr('x', d => x(d.label)).attr('y', d => y(d.value))
    .attr('width', x.bandwidth()).attr('height', d => h - y(d.value))
    .attr('fill', color).attr('rx', 3).attr('opacity', 0.88)
    .style('cursor', 'pointer')
    .on('mousemove', function(event, d) {
      tip.style.display = 'block';
      tip.style.left = (event.clientX + 12) + 'px';
      tip.style.top  = (event.clientY - 10) + 'px';
      tip.innerHTML = `<strong>${esc(d.label)}</strong><br>${d.value.toLocaleString()} records`;
      d3.select(this).attr('opacity', 1);
    })
    .on('mouseleave', function() { tip.style.display = 'none'; d3.select(this).attr('opacity', 0.88); });

  // Value labels on top of bars (only if bar is wide enough)
  if (x.bandwidth() > 22) {
    svg.selectAll('.bar-label').data(data).enter().append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', d => y(d.value) - 4)
      .attr('text-anchor', 'middle').style('font-size', '10px').style('fill', '#94a3b8')
      .text(d => d.value >= 1000 ? (d.value/1000).toFixed(1)+'k' : d.value);
  }
}

function drawHorizontalBarChart(containerId, data, color, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const barH    = 26;
  const margin  = { top: 8, right: 60, bottom: 8, left: opts.marginLeft ?? 180 };
  const totalW  = container.clientWidth || 520;
  const w       = totalW - margin.left - margin.right;
  const totalH  = data.length * barH + margin.top + margin.bottom;

  const svg = d3.select(`#${containerId}`).append('svg')
    .attr('width', totalW).attr('height', totalH)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.value) * 1.08]).nice().range([0, w]);
  const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, data.length * barH]).padding(0.22);

  // Grid lines
  svg.append('g')
    .call(d3.axisTop(x).ticks(5).tickSize(-(data.length * barH)).tickFormat(''))
    .selectAll('line').style('stroke', '#2a2f3d').style('stroke-dasharray', '3,3');
  svg.selectAll('.domain').remove();

  // Y axis (labels)
  svg.append('g').call(d3.axisLeft(y).tickSize(0))
    .selectAll('text')
    .style('fill', '#94a3b8').style('font-size', '11px')
    .attr('dx', '-6');
  svg.select('.domain').remove();

  // Tooltip
  const tip = _ensureTooltip('bar-tooltip', 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:7px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none');

  // Bars
  svg.selectAll('.bar').data(data).enter().append('rect')
    .attr('y', d => y(d.label)).attr('x', 0)
    .attr('height', y.bandwidth()).attr('width', d => x(d.value))
    .attr('fill', color).attr('rx', 3).attr('opacity', 0.88)
    .style('cursor', 'pointer')
    .on('mousemove', function(event, d) {
      tip.style.display = 'block';
      tip.style.left = (event.clientX + 12) + 'px';
      tip.style.top  = (event.clientY - 10) + 'px';
      tip.innerHTML = `<strong>${esc(d.label)}</strong><br>${d.value.toLocaleString()} records`;
      d3.select(this).attr('opacity', 1);
    })
    .on('mouseleave', function() { tip.style.display = 'none'; d3.select(this).attr('opacity', 0.88); });

  // Value labels at end of bars
  svg.selectAll('.bar-label').data(data).enter().append('text')
    .attr('y', d => y(d.label) + y.bandwidth() / 2)
    .attr('x', d => x(d.value) + 5)
    .attr('dy', '0.35em')
    .style('font-size', '10px').style('fill', '#64748b')
    .text(d => d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value);
}

// opts: { unit, centerLabel, centerValue, valueFmt, legendFmt, colorMap, coloredLabels, onClick, totalOverride }
//   unit          — word after the value in the tooltip  (default: 'entities')
//   centerLabel   — small text below the center number   (default: 'entities')
//   centerValue   — override the center big number text  (default: formatted total)
//   valueFmt      — fn(value) for tooltip value display  (default: toLocaleString)
//   legendFmt     — fn(value, pct) for legend right col  (default: pct + '%')
//   colorMap      — {label: color} overrides indexed colors array per label
//   coloredLabels — if true, legend label text is colored with the slice color
//   onClick       — fn(label, value) called when a slice or legend row is clicked
//   totalOverride — use this number as the denominator for tooltip percentages instead of sum of slice values
//   pctFn        — fn(datum) => number: custom per-slice percentage (overrides totalOverride for tooltip + legend)
//   onHover      — fn(datum) called on slice mousemove
//   onLeave      — fn() called when mouse leaves a slice
function drawPieChart(containerId, data, colors, opts) {
  const container = document.getElementById(containerId);
  if (!container || !data.length) return;

  const unit          = (opts && opts.unit)          || 'entities';
  const centerLabel   = (opts && opts.centerLabel)   || 'entities';
  const centerValue   = (opts && opts.centerValue)   || null;
  const valueFmt      = (opts && opts.valueFmt)      || (v => v.toLocaleString());
  const legendFmt     = (opts && opts.legendFmt)     || ((_v, pct) => pct + '%');
  const colorMap      = (opts && opts.colorMap)      || null;
  const coloredLabels = (opts && opts.coloredLabels) || false;
  const onClick       = (opts && opts.onClick)       || null;
  const totalOverride = (opts && opts.totalOverride) || null;
  const pctFn        = (opts && opts.pctFn)        || null;
  const onHover      = (opts && opts.onHover)      || null;
  const onLeave      = (opts && opts.onLeave)      || null;

  // Resolve color for a data point — colorMap takes priority over indexed array
  const getColor = (label, i) => (colorMap && colorMap[label]) || (colors && colors[i % colors.length]) || _hashColor(label);

  const size = 220;
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.42;
  const sliceTotal = data.reduce((s, d) => s + d.value, 0);
  const total = totalOverride || sliceTotal;

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', size).attr('height', size)
    .attr('style', 'flex-shrink:0');

  const g = svg.append('g').attr('transform', `translate(${size/2},${size/2})`);

  const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.018);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius).cornerRadius(3);
  const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 6).cornerRadius(3);

  // Tooltip div (shared)
  const tip = _ensureTooltip('pie-tooltip', 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:8px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none;max-width:200px;line-height:1.5');

  g.selectAll('path')
    .data(pie(data))
    .enter().append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => getColor(d.data.label, i))
    .attr('stroke', '#0d0f14').attr('stroke-width', 1.5)
    .style('cursor', 'pointer')
    .on('mousemove', function(event, d) {
      const pct = pctFn ? pctFn(d.data).toFixed(1) : ((d.data.value / total) * 100).toFixed(1);
      tip.style.display = 'block';
      tip.style.left = (event.clientX + 14) + 'px';
      tip.style.top  = (event.clientY - 10) + 'px';
      tip.innerHTML = `<strong>${esc(d.data.label)}</strong><br>${valueFmt(d.data.value)} ${unit}<br><span style="color:#64748b">${pct}% of records</span>`;
      d3.select(this).attr('d', arcHover);
      if (onHover) onHover(d.data);
    })
    .on('mouseleave', function() {
      tip.style.display = 'none';
      d3.select(this).attr('d', arc);
      if (onLeave) onLeave();
    })
    .on('click', function(_event, d) {
      if (onClick) onClick(d.data.label, d.data.value);
    });

  // Centre label
  const centerText = centerValue !== null ? centerValue
    : (total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toLocaleString());
  g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em')
    .style('font-size', '15px').style('font-weight', '700').style('fill', '#e2e8f0')
    .text(centerText);
  g.append('text').attr('text-anchor', 'middle').attr('dy', '1.1em')
    .style('font-size', '10px').style('fill', '#64748b')
    .text(centerLabel);

  // Legend
  const legend = d3.select(`#${containerId}`)
    .append('div')
    .attr('style', 'flex:1;min-width:120px;display:flex;flex-direction:column;gap:5px;padding-top:6px');

  data.forEach((d, i) => {
    const pct   = pctFn ? pctFn(d).toFixed(1) : ((d.value / (totalOverride || sliceTotal)) * 100).toFixed(1);
    const color = getColor(d.label, i);
    const row = legend.append('div')
      .attr('style', `display:flex;align-items:center;gap:7px;font-size:11px;color:#e2e8f0;cursor:${onClick ? 'pointer' : 'default'}`)
      .html(`<span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></span>
             <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${coloredLabels ? `color:${color}` : ''}" title="${esc(d.label)}">${esc(d.label)}</span>
             <span style="color:#64748b;flex-shrink:0">${legendFmt(d.value, pct)}</span>`);
    if (onClick) row.on('click', () => onClick(d.label, d.value));
  });
}

function drawStackedBarChart(containerId, sectors, states) {
  const container = document.getElementById(containerId);
  if (!container || !states.length) return;

  const COLORS = ['#4f8ef7','#3ecf8e','#f6c90e','#7c5cbf','#f56565','#38bdf8','#fb923c','#a3e635','#e879f9','#34d399','#fbbf24','#818cf8','#f472b6','#2dd4bf','#facc15','#64748b'];
  const margin = { top: 10, right: 16, bottom: 72, left: 50 };
  const totalW = container.clientWidth || 600;
  const totalH = 560;
  const w = totalW - margin.left - margin.right;
  const h = totalH - margin.top - margin.bottom;

  const x = d3.scaleBand().domain(states.map(d => d.state)).range([0, w]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(states, d => d.total) * 1.08]).nice().range([h, 0]);
  const layers = d3.stack().keys(sectors)(states);

  const svg = d3.select(`#${containerId}`).append('svg')
    .attr('width', totalW).attr('height', totalH)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(''))
    .selectAll('line').style('stroke', '#2a2f3d').style('stroke-dasharray', '3,3');
  svg.selectAll('.domain').remove();

  svg.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(n => n >= 1000 ? (n/1000).toFixed(0)+'k' : n))
    .selectAll('text').style('fill', '#64748b').style('font-size', '11px');
  svg.selectAll('.tick line').style('display', 'none');

  svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0))
    .selectAll('text').style('fill', '#64748b').style('font-size', '11px')
    .attr('transform', 'rotate(-38)').style('text-anchor', 'end');
  svg.select('.domain').style('stroke', '#2a2f3d');

  const tip = _ensureTooltip('stacked-tooltip', 'position:fixed;pointer-events:none;background:#1e222d;border:1px solid #2a2f3d;border-radius:8px;padding:7px 12px;font-size:12px;color:#e2e8f0;z-index:9999;display:none');

  layers.forEach((layer, i) => {
    svg.selectAll(null).data(layer).enter().append('rect')
      .attr('x', d => x(d.data.state))
      .attr('y', d => y(d[1]))
      .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
      .attr('width', x.bandwidth())
      .attr('fill', COLORS[i] || '#64748b')
      .attr('opacity', 0.88)
      .on('mousemove', function(event, d) {
        const val = d[1] - d[0];
        if (val <= 0) return;
        tip.style.display = 'block';
        tip.style.left = (event.clientX + 12) + 'px';
        tip.style.top  = (event.clientY - 10) + 'px';
        tip.innerHTML = `<strong>${esc(d.data.state)}</strong> — ${esc(sectors[i])}<br>${val.toLocaleString()} records`;
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function() { tip.style.display = 'none'; d3.select(this).attr('opacity', 0.88); });
  });
}

function _drawMedicaidRateChart() {
  const el = document.getElementById('pie-medicaid-rate');
  if (!el || !_statsMeta || !_statsMeta.popData || !_statsMeta.medicaidByState) return;

  // Build state-name → population lookup
  const popMap = {};
  for (const { label, value } of _statsMeta.popData) popMap[label] = value;

  // National totals
  const totalExcluded = Object.values(_statsMeta.medicaidByState).reduce((s, n) => s + n, 0);
  const totalPop      = _statsMeta.popData.reduce((s, r) => s + r.value, 0);

  // Overrepresentation = (state_excluded% of national) - (state_pop% of national)
  // Positive → state has disproportionately more exclusions than its population share
  const rateData = [];
  for (const [state, excluded] of Object.entries(_statsMeta.medicaidByState)) {
    const pop = popMap[state];
    if (!pop || !excluded) continue;
    const exclPct = (excluded / totalExcluded) * 100;
    const popPct  = (pop      / totalPop)      * 100;
    const diff    = parseFloat((exclPct - popPct).toFixed(4));
    if (diff > 0) rateData.push({ label: state, value: diff });
  }
  rateData.sort((a, b) => b.value - a.value);

  el.innerHTML = '';
  drawPieChart('pie-medicaid-rate', rateData.slice(0, 10), null, {
    colorMap: STATE_COLOR_MAP,
    unit: 'pp over population share',
    centerLabel: 'states',
    centerValue: rateData.slice(0, 10).length.toString(),
    valueFmt: v => '+' + v.toFixed(2) + 'pp',
    legendFmt: v => '+' + v.toFixed(2) + 'pp',
  });
}
