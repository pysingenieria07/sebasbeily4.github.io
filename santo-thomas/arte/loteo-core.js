/* Loteo — generador de planos de urbanización con semilla.
   Un predio irregular se parte en manzanas con vías que se adelgazan en cada
   nivel; cada manzana se parcela en lotes espalda con espalda. Sin dependencias:
   lo usan la página (canvas 2D) y el visor de p5.js. */
(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DEFAULTS = {
    manzana: 15000,     // área a partir de la cual una pieza deja de partirse
    frente: 24,         // frente del lote
    via: 24,            // ancho de la vía principal
    verdes: 0.1,        // proporción de manzanas que quedan como zona verde
    construido: 0.3,    // proporción de lotes con casa
    irregular: 0.22,    // cuánto se aparta el lindero del predio de un óvalo
    giro: null          // ángulo del trazado en radianes (null = lo decide la semilla)
  };

  function generate(seed, W, H, opt, rng, ruido) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in (opt || {})) if (opt[k] !== undefined && opt[k] !== null) o[k] = opt[k];
    var R = rng || mulberry32(seed * 9973 + 17);
    var rr = function (a, b) { return a + (b - a) * R(); };

    var k = Math.sqrt(W * H) / 1100;                 // los parámetros están pensados para ~1200 px
    o.manzana *= k * k; o.frente *= k; o.via *= k;
    var angle = o.giro === null ? rr(-0.42, 0.42) : o.giro;
    var side = Math.sqrt(W * W + H * H) * 1.04;      // el trazado cubre el lienzo aun girado
    var roads = [], blocks = [];

    (function split(x, y, w, h, depth, minDepth) {
      var area = w * h, long = Math.max(w, h), short = Math.min(w, h);
      var stop = area < o.manzana * rr(0.75, 1.3) || short < o.frente * 3.2 || depth > 7;
      if (stop && long / short < 3.2) { blocks.push({ x: x, y: y, w: w, h: h, minDepth: minDepth }); return; }
      var rw = Math.max(3 * k, o.via * Math.pow(0.66, depth));
      var r = rr(0.38, 0.62), vertical = w >= h;      // corta siempre el lado largo
      if (vertical) {
        var cx = x + w * r;
        roads.push({ x: cx - rw / 2, y: y, w: rw, h: h, depth: depth, vertical: true });
        split(x, y, cx - rw / 2 - x, h, depth + 1, Math.min(minDepth, depth));
        split(cx + rw / 2, y, x + w - cx - rw / 2, h, depth + 1, Math.min(minDepth, depth));
      } else {
        var cy = y + h * r;
        roads.push({ x: x, y: cy - rw / 2, w: w, h: rw, depth: depth, vertical: false });
        split(x, y, w, cy - rw / 2 - y, depth + 1, Math.min(minDepth, depth));
        split(x, cy + rw / 2, w, y + h - cy - rw / 2, depth + 1, Math.min(minDepth, depth));
      }
    })(-side / 2, -side / 2, side, side, 0, 9);

    // La obra avanza desde un frente: el orden de aparición es la distancia a ese punto.
    var front = { x: rr(-0.3, 0.3) * side, y: rr(0.2, 0.45) * side };
    var lots = [], gap = Math.max(1, 2.4 * k);
    // La manzana de la torre: la más cercana al centro entre las grandes.
    var towerIdx = -1, best = 1e9;
    blocks.forEach(function (b, i) {
      var d = Math.hypot(b.x + b.w / 2, b.y + b.h / 2);
      if (d < best && b.w * b.h > o.manzana * 0.55) { best = d; towerIdx = i; }
    });

    blocks.forEach(function (b, i) {
      var m = Math.max(1, 2.5 * k), x = b.x + m, y = b.y + m, w = b.w - 2 * m, h = b.h - 2 * m;
      if (w < 6 * k || h < 6 * k) return;
      var push = function (lx, ly, lw, lh, kind) {
        lots.push({ x: lx, y: ly, w: lw, h: lh, kind: kind,
          tint: ruido ? Math.min(0.999, Math.max(0, ruido(lx, ly) * 0.75 + R() * 0.25)) : R(),
          casa: kind === 'residencial' && R() < o.construido,
          order: Math.hypot(lx + lw / 2 - front.x, ly + lh / 2 - front.y) / side + rr(0, 0.06) });
      };
      if (i === towerIdx) { push(x, y, w, h, 'torre'); return; }
      if (R() < o.verdes) { push(x, y, w, h, 'verde'); return; }
      var sobrePrincipal = roads.some(function (rd) {       // comercio solo frente a la vía principal
        var pad = o.via * 0.6;
        return rd.depth <= 1 && rd.x < b.x + b.w + pad && rd.x + rd.w > b.x - pad &&
          rd.y < b.y + b.h + pad && rd.y + rd.h > b.y - pad && (rd.depth === 0 || R() < 0.35);
      });
      var kind = sobrePrincipal && R() < 0.75 ? 'comercial' : 'residencial';
      var horiz = w >= h, L = horiz ? w : h, S = horiz ? h : w;
      var rows = S > o.frente * 1.9 ? 2 : 1, rowS = (S - gap * (rows - 1)) / rows;
      for (var r2 = 0; r2 < rows; r2++) {
        var n = Math.max(1, Math.round(L / (o.frente * (kind === 'comercial' ? 1.5 : 1) * rr(0.9, 1.15))));
        var lw = (L - gap * (n - 1)) / n;
        for (var j = 0; j < n; j++) {
          var a = j * (lw + gap), s = r2 * (rowS + gap);
          if (horiz) push(x + a, y + s, lw, rowS, kind); else push(x + s, y + a, rowS, lw, kind);
        }
      }
    });

    // Lindero del predio: un óvalo deformado, como los predios reales vistos desde el dron.
    var parcel = [], nv = 9, ph = rr(0, 6.28);
    for (var v = 0; v < nv; v++) {
      var th = ph + (v / nv) * Math.PI * 2;
      var rad = 1 + rr(-o.irregular, o.irregular);
      parcel.push({ x: W / 2 + Math.cos(th) * W * 0.47 * rad, y: H / 2 + Math.sin(th) * H * 0.47 * rad });
    }
    var maxOrder = 0; lots.forEach(function (l) { if (l.order > maxOrder) maxOrder = l.order; });
    lots.forEach(function (l) { l.order /= maxOrder; });
    return { W: W, H: H, angle: angle, roads: roads, lots: lots, parcel: parcel, side: side };
  }

  var STYLE = {
    suelo: '#16271c', predio: '#1f3b2b', lote: ['#2a4a36', '#2f523b', '#274633'],
    verde: '#3f7a4d', via: '#d9c9a0', casa: '#f4f4f0', torre: '#f4f4f0', acento: '#e0a63a', atenuar: 0.28
  };

  // t: avance de la obra entre 0 y 1. destacado: tipo de lote a resaltar o null.
  function draw(ctx, plan, t, style, destacado, fullBleed) {
    var s = style || STYLE, W = plan.W, H = plan.H;
    var ease = function (x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
    ctx.save();
    ctx.fillStyle = s.suelo; ctx.fillRect(0, 0, W, H);
    if (!fullBleed) {
      ctx.beginPath();
      plan.parcel.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.clip();
    }
    ctx.fillStyle = s.predio; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(plan.angle);

    // Lotes: aparecen en el orden en que avanza el frente de obra.
    plan.lots.forEach(function (l) {
      var a = ease((t - 0.3 - l.order * 0.55) / 0.15);
      if (a <= 0) return;
      var hi = destacado && (l.kind === destacado || (destacado === 'casa' && l.casa));
      ctx.globalAlpha = a * (destacado && !hi ? s.atenuar + 0.25 : 1);
      var inset = (1 - a) * Math.min(l.w, l.h) * 0.35;
      if (l.kind === 'verde') ctx.fillStyle = s.verde;
      else if (hi && destacado !== 'casa') ctx.fillStyle = s.acento;
      else ctx.fillStyle = s.lote[Math.floor(l.tint * s.lote.length)];
      ctx.fillRect(l.x + inset, l.y + inset, l.w - 2 * inset, l.h - 2 * inset);
      if (l.kind === 'torre') {
        var m = Math.min(l.w, l.h) * 0.22;
        ctx.fillStyle = hi ? '#16271c' : s.torre;
        ctx.fillRect(l.x + m, l.y + m, l.w - 2 * m, l.h - 2 * m);
        ctx.fillStyle = hi ? s.acento : s.predio;
        ctx.fillRect(l.x + m * 1.6, l.y + m * 1.6, l.w - 3.2 * m, l.h - 3.2 * m);
      } else if (l.casa) {
        var cw = Math.min(l.w, l.h) * 0.56;
        ctx.fillStyle = hi ? s.acento : s.casa;
        ctx.fillRect(l.x + (l.w - cw) / 2, l.y + (l.h - cw) / 2, cw, cw);
      }
    });
    ctx.globalAlpha = 1;

    // Vías: primero la principal, después las de cada nivel, creciendo a lo largo.
    ctx.fillStyle = s.via;
    plan.roads.forEach(function (r) {
      var g = ease((t - r.depth * 0.055) / 0.22);
      if (g <= 0) return;
      if (r.vertical) ctx.fillRect(r.x, r.y, r.w, r.h * g); else ctx.fillRect(r.x, r.y, r.w * g, r.h);
    });
    ctx.restore();
  }

  root.Loteo = { generate: generate, draw: draw, STYLE: STYLE, DEFAULTS: DEFAULTS, rng: mulberry32 };
})(typeof window !== 'undefined' ? window : globalThis);
