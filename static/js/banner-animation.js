/**
 * Banner canvas animation — scoped to a fixed-height container element.
 * Usage: BannerAnimation.init(canvasEl)  /  BannerAnimation.destroy()
 */
var BannerAnimation = (function () {

  var gap          = 40;
  var radiusVmin   = 30;
  var speedIn      = 0.5;
  var speedOut     = 0.6;
  var restScale    = 0.09;
  var minHoverScale = 1;
  var maxHoverScale = 3;
  var waveSpeed    = 1200;
  var waveWidth    = 180;

  var PALETTE = [
    { type: 'solid', value: '#60a5fa' },   // --accent
    { type: 'solid', value: '#a78bfa' },   // --accent2
    { type: 'solid', value: '#34d399' },   // --green
    { type: 'solid', value: '#facc15' },   // --yellow
    { type: 'solid', value: '#ef4444' },   // --red
    { type: 'solid', value: '#f97316' },   // orange (chart accent)
    { type: 'solid', value: '#9ca3af' },   // --muted
    { type: 'gradient', stops: ['#60a5fa', '#a78bfa'] },
    { type: 'gradient', stops: ['#a78bfa', '#34d399'] },
    { type: 'gradient', stops: ['#34d399', '#60a5fa'] },
    { type: 'gradient', stops: ['#facc15', '#f97316'] },
    { type: 'gradient', stops: ['#ef4444', '#a78bfa'] },
    { type: 'gradient', stops: ['#60a5fa', '#34d399'] },
    { type: 'gradient', stops: ['#a78bfa', '#60a5fa'] },
  ];

  var SHAPE_TYPES = ['circle', 'pill', 'star', 'star'];

  // — state —
  var _canvas  = null;
  var _ctx     = null;
  var _grid    = null;
  var _rafId   = null;
  var _pointer = null;
  var _activity = 0;
  var _waves   = [];
  var _frameCount = 0;
  var _resizeObs  = null;

  // — helpers —
  function rnd(min, max)     { return Math.random() * (max - min) + min; }
  function rndInt(min, max)  { return Math.floor(rnd(min, max + 1)); }
  function pick(arr)         { return arr[Math.floor(Math.random() * arr.length)]; }

  function smoothstep(t) {
    var c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  }

  function durationToFactor(seconds) {
    if (seconds <= 0) return 1;
    return 1 - Math.pow(0.05, 1 / (60 * seconds));
  }

  // — drawing —
  function drawCircle(ctx, size) {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPill(ctx, size) {
    var w = size * 0.48, h = size;
    ctx.beginPath();
    ctx.roundRect(-w, -h, w * 2, h * 2, w);
    ctx.fill();
  }

  function drawStar(ctx, size, points, innerRatio) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var angle = (i * Math.PI) / points - Math.PI / 2;
      var r = i % 2 === 0 ? size : size * innerRatio;
      i === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
              : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawShape(ctx, shape) {
    switch (shape.type) {
      case 'circle': return drawCircle(ctx, shape.size / 1.5);
      case 'pill':   return drawPill(ctx, shape.size / 1.4);
      case 'star':   return drawStar(ctx, shape.size, shape.points, shape.innerRatio);
    }
  }

  function resolveFill(ctx, colorDef, size) {
    if (colorDef.type === 'solid') return colorDef.value;
    var grad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, size * 0.3, size * 1.5);
    grad.addColorStop(0, colorDef.stops[0]);
    grad.addColorStop(1, colorDef.stops[1]);
    return grad;
  }

  function randomStarProps() {
    return { points: rndInt(4, 10), innerRatio: rnd(0.1, 0.5) };
  }

  // — grid —
  function buildGrid(W, H) {
    var cols    = Math.floor(W / gap);
    var rows    = Math.floor(H / gap);
    var offsetX = (W - (cols - 1) * gap) / 2;
    var offsetY = (H - (rows - 1) * gap) / 2;
    var shapes  = [];
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var type  = pick(SHAPE_TYPES);
        var shape = {
          x: offsetX + col * gap,
          y: offsetY + row * gap,
          type: type,
          color: pick(PALETTE),
          angle: rnd(0, Math.PI * 2),
          size: gap * 0.38,
          scale: restScale,
          maxScale: rnd(minHoverScale, maxHoverScale),
          hovered: false,
        };
        if (type === 'star') Object.assign(shape, randomStarProps());
        shapes.push(shape);
      }
    }
    return { shapes: shapes, width: W, height: H };
  }

  // — setup / resize —
  function setup() {
    if (!_canvas) return;
    var wrap = _canvas.parentElement;
    var W    = wrap.offsetWidth;
    var H    = wrap.offsetHeight;
    var dpr  = window.devicePixelRatio || 1;
    _canvas.width  = W * dpr;
    _canvas.height = H * dpr;
    _canvas.style.width  = W + 'px';
    _canvas.style.height = H + 'px';
    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    _ctx.scale(dpr, dpr);
    _grid = buildGrid(W, H);
  }

  // — animation loop —
  function tick() {
    if (!_canvas || !_grid) { _rafId = requestAnimationFrame(tick); return; }

    var shapes = _grid.shapes;
    var W      = _grid.width;
    var H      = _grid.height;
    var radius = Math.min(W, H) * (radiusVmin / 100);
    var now    = performance.now();

    _ctx.clearRect(0, 0, W, H);
    _ctx.fillStyle = '#0d0f14';
    _ctx.fillRect(0, 0, W, H);

    _activity *= 0.93;

    _frameCount++;

    var maxDist = Math.sqrt(W * W + H * H);
    _waves = _waves.filter(function (w) {
      return (now - w.startTime) / 1000 * waveSpeed < maxDist + waveWidth;
    });

    for (var i = 0; i < shapes.length; i++) {
      var shape = shapes[i];

      // pointer influence
      var pointerInfluence = 0;
      if (_pointer && _activity > 0.001) {
        var dx   = shape.x - _pointer.x;
        var dy   = shape.y - _pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        pointerInfluence = smoothstep(1 - dist / radius) * _activity;

        if (pointerInfluence > 0.05 && !shape.hovered) {
          shape.hovered   = true;
          shape.maxScale  = rnd(minHoverScale, maxHoverScale);
          shape.angle     = rnd(0, Math.PI * 2);
          if (shape.type === 'star') Object.assign(shape, randomStarProps());
        } else if (pointerInfluence <= 0.05) {
          shape.hovered = false;
        }
      } else {
        shape.hovered = false;
      }

      // wave influence
      var waveInfluence = 0;
      for (var j = 0; j < _waves.length; j++) {
        var wave       = _waves[j];
        var waveRadius = (now - wave.startTime) / 1000 * waveSpeed;
        var wdx        = shape.x - wave.x;
        var wdy        = shape.y - wave.y;
        var wdist      = Math.sqrt(wdx * wdx + wdy * wdy);
        var t          = 1 - Math.abs(wdist - waveRadius) / waveWidth;
        if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
      }

      var pointerTarget = restScale + pointerInfluence * (shape.maxScale - restScale);
      var waveTarget    = restScale + waveInfluence   * (shape.maxScale - restScale);
      var target        = Math.max(pointerTarget, waveTarget);

      var factor = target > shape.scale ? durationToFactor(speedIn) : durationToFactor(speedOut);
      shape.scale += (target - shape.scale) * factor;

      if (shape.scale < restScale * 0.15) continue;

      _ctx.save();
      _ctx.translate(shape.x, shape.y);
      _ctx.rotate(shape.angle);
      _ctx.scale(shape.scale, shape.scale);
      _ctx.fillStyle = resolveFill(_ctx, shape.color, shape.size);
      drawShape(_ctx, shape);
      _ctx.restore();
    }

    _rafId = requestAnimationFrame(tick);
  }

  // — events —
  function onMove(e) {
    if (!_canvas) return;
    var rect  = _canvas.getBoundingClientRect();
    _pointer  = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    _activity = 1;
  }

  function onCanvasClick(e) {
    var rect = _canvas.getBoundingClientRect();
    triggerWave(e.clientX - rect.left, e.clientY - rect.top);
  }

  function triggerWave(x, y) {
    _waves.push({ x: x, y: y, startTime: performance.now() });
  }

  // — public API —
  function init(canvasEl) {
    // Clean up any previous instance
    destroy();

    _canvas   = canvasEl;
    _ctx      = canvasEl.getContext('2d');
    _pointer  = null;
    _activity = 0;
    _waves    = [];
    _frameCount = 0;

    setup();

    _resizeObs = new ResizeObserver(setup);
    _resizeObs.observe(_canvas.parentElement);

    _canvas.addEventListener('click', onCanvasClick);
    window.addEventListener('pointermove', onMove);

    _rafId = requestAnimationFrame(tick);

    // Initial wave from the centre of the banner
    setTimeout(function () {
      if (_grid) triggerWave(_grid.width / 2, _grid.height / 2);
    }, 80);
  }

  function destroy() {
    if (_rafId)      { cancelAnimationFrame(_rafId); _rafId = null; }
    if (_resizeObs)  { _resizeObs.disconnect(); _resizeObs = null; }
    if (_canvas)     { _canvas.removeEventListener('click', onCanvasClick); }
    window.removeEventListener('pointermove', onMove);
    _canvas   = null;
    _ctx      = null;
    _grid     = null;
    _pointer  = null;
    _activity = 0;
    _waves    = [];
  }

  function isActive() { return _rafId !== null; }

  return { init: init, destroy: destroy, isActive: isActive };
})();
