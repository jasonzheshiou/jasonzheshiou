/* Hand-drawn SVG charts. No library.
   Each <div data-chart data-spec='{...}'> becomes an <svg class="chart">.
   Every number plotted here is written inline in the page HTML, beside the
   data table that backs it, so the figures are auditable without running JS. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(n, a, txt) {
    var e = document.createElementNS(NS, n);
    for (var k in a) e.setAttribute(k, a[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function txt(x, y, s, cls, extra) {
    var a = { x: x, y: y, "class": cls };
    if (extra) for (var k in extra) a[k] = extra[k];
    return el("text", a, s);
  }
  var W = 760, H = 300, M = { t: 20, r: 18, b: 36, l: 46 };

  /* ---- line chart: A/E series ---- */
  function lines(svg, s) {
    var xs = s.x, n = xs.length;
    var lo = s.y[0], hi = s.y[1], iw = W - M.l - M.r, ih = H - M.t - M.b;
    var X = function (i) { return M.l + (n === 1 ? iw / 2 : i * iw / (n - 1)); };
    var Y = function (v) { return M.t + (hi - v) * ih / (hi - lo); };
    if (s.band) {
      var i0 = xs.indexOf(s.band.from), i1 = xs.indexOf(s.band.to);
      svg.appendChild(el("rect", {
        "class": "band1", x: X(i0) - 12, y: M.t, width: (X(i1) - X(i0)) + 24, height: ih
      }));
      if (s.band.label)
        svg.appendChild(txt(X(i0) + (X(i1) - X(i0)) / 2, M.t + 11, s.band.label, "anno", { "text-anchor": "middle" }));
    }
    var tickLabel = s.unit === "%" ? function (t) { return t + "%"; }
                  : s.unit ? function (t) { return t + s.unit; }
                  : function (t) { return t.toFixed(2); };
    (s.ticks || []).forEach(function (t) {
      svg.appendChild(el("line", { "class": t === s.ref ? "zero" : "grid", x1: M.l, x2: W - M.r, y1: Y(t), y2: Y(t) }));
      svg.appendChild(txt(M.l - 8, Y(t) + 3.5, tickLabel(t), "tick", { "text-anchor": "end" }));
    });
    xs.forEach(function (lab, i) {
      if (s.every && i % s.every !== 0) return;
      svg.appendChild(txt(X(i), H - M.b + 18, lab, "tick", { "text-anchor": "middle" }));
    });
    svg.appendChild(el("line", { "class": "axis", x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }));
    s.series.forEach(function (se) {
      var d = se.values.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }).join(" ");
      svg.appendChild(el("path", { "class": "series " + se.cls, d: d }));
      var last = se.values.length - 1;
      svg.appendChild(el("circle", { "class": "dot " + se.cls, cx: X(last), cy: Y(se.values[last]), r: 3.4 }));
      if (se.label)
        svg.appendChild(txt(X(last) - 8, Y(se.values[last]) + (se.dy || -9), se.label, "anno", { "text-anchor": "end" }));
    });
    (s.anno || []).forEach(function (a) {
      svg.appendChild(txt(X(xs.indexOf(a.x)) + (a.dx || 0), Y(a.y) + (a.dy || 0), a.t, "anno", { "text-anchor": a.anchor || "middle" }));
    });
  }

  /* ---- scatter: accuracy vs false-alarm rate ---- */
  function scatter(svg, s) {
    var iw = W - M.l - M.r, ih = H - M.t - M.b;
    var d = s.domain;
    var X = function (v) { return M.l + (v - d.x0) * iw / (d.x1 - d.x0); };
    var Y = function (v) { return M.t + (d.y1 - v) * ih / (d.y1 - d.y0); };
    (s.xticks || []).forEach(function (t) {
      svg.appendChild(el("line", { "class": "grid", x1: X(t), x2: X(t), y1: M.t, y2: H - M.b }));
      svg.appendChild(txt(X(t), H - M.b + 18, t + "%", "tick", { "text-anchor": "middle" }));
    });
    (s.yticks || []).forEach(function (t) {
      svg.appendChild(el("line", { "class": "grid", x1: M.l, x2: W - M.r, y1: Y(t), y2: Y(t) }));
      svg.appendChild(txt(M.l - 8, Y(t) + 3.5, t + "%", "tick", { "text-anchor": "end" }));
    });
    svg.appendChild(el("line", { "class": "axis", x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }));
    svg.appendChild(el("line", { "class": "axis", x1: M.l, x2: M.l, y1: M.t, y2: H - M.b }));
    svg.appendChild(txt(M.l + 4, M.t + 11, s.ytitle || "", "lab"));
    svg.appendChild(txt(W - M.r, H - 6, s.xtitle || "", "lab", { "text-anchor": "end" }));
    s.points.forEach(function (p) {
      svg.appendChild(el("circle", { "class": "hit", cx: X(p.x), cy: Y(p.y), r: 5.5, "fill-opacity": p.hollow ? "0" : "1" }));
      svg.appendChild(txt(X(p.x) + (p.dx == null ? 10 : p.dx), Y(p.y) + (p.dy || 4), p.label, "anno",
        p.anchor ? { "text-anchor": p.anchor } : null));
    });
  }

  /* ---- paired bars: two measures with different units ---- */
  function paired(svg, s) {
    var rowH = 62, top = 22, iw = W - M.l - M.r;
    var maxA = Math.max.apply(null, s.rows.map(function (r) { return r.a; }));
    var maxB = Math.max.apply(null, s.rows.map(function (r) { return r.b; }));
    s.rows.forEach(function (r, i) {
      var y0 = top + i * rowH;
      svg.appendChild(txt(M.l, y0 + 12, r.label, "anno"));
      var wa = r.a / maxA * (iw - 190), wb = r.b / maxB * (iw - 190);
      svg.appendChild(el("rect", { x: M.l, y: y0 + 20, width: Math.max(2, wa), height: 13, rx: 3, fill: "var(--teal)" }));
      svg.appendChild(txt(M.l + wa + 8, y0 + 31, r.a.toFixed(s.aDec == null ? 2 : s.aDec) + " " + (s.aFmt || ""), "lab"));
      svg.appendChild(el("rect", { x: M.l, y: y0 + 38, width: Math.max(2, wb), height: 13, rx: 3, fill: "var(--amber)" }));
      svg.appendChild(txt(M.l + wb + 8, y0 + 49, r.b.toFixed(s.bDec == null ? 1 : s.bDec) + " " + (s.bFmt || ""), "lab"));
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + (top + s.rows.length * rowH + 8));
    svg.style.marginBottom = "-14px";
  }

  /* ---- dumbbell: optimism gap ---- */
  function dumbbell(svg, s) {
    var top = 26, rowH = 56, iw = W - M.l - M.r;
    var d = s.domain;
    var X = function (v) { return M.l + (v - d.x0) * iw / (d.x1 - d.x0); };
    (s.xticks || []).forEach(function (t) {
      svg.appendChild(el("line", { "class": "grid", x1: X(t), x2: X(t), y1: top - 8, y2: top + s.rows.length * rowH - 14 }));
      svg.appendChild(txt(X(t), top + s.rows.length * rowH + 4, t + "%", "tick", { "text-anchor": "middle" }));
    });
    s.rows.forEach(function (r, i) {
      var y = top + i * rowH + 12;
      svg.appendChild(txt(M.l, y - 12, r.label, "anno"));
      svg.appendChild(el("line", { x1: X(r.b), x2: X(r.a), y1: y, y2: y, stroke: "var(--line-2)", "stroke-width": 2 }));
      svg.appendChild(el("circle", { cx: X(r.a), cy: y, r: 6, fill: "var(--line-2)", stroke: "var(--line-2)", "class": "dot" }));
      svg.appendChild(el("circle", { cx: X(r.b), cy: y, r: 6, fill: "var(--teal)", stroke: "var(--teal)", "class": "dot" }));
      svg.appendChild(txt(X(r.a) + 10, y + 4, "tuning " + r.a + "%", "lab"));
      svg.appendChild(txt(X(r.b) - 10, y + 4, "held-out " + r.b + "%", "lab", { "text-anchor": "end" }));
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + (top + s.rows.length * rowH + 18));
  }

  /* ---- horizontal bars: one measure, categorical ---- */
  function hbars(svg, s) {
    var rowH = 46, top = 18, iw = W - M.l - M.r;
    var max = s.max || Math.max.apply(null, s.rows.map(function (r) { return r.value; }));
    s.rows.forEach(function (r, i) {
      var y = top + i * rowH;
      svg.appendChild(txt(M.l, y + 11, r.label, "anno"));
      if (r.note) svg.appendChild(txt(W - M.r, y + 11, r.note, "lab", { "text-anchor": "end" }));
      var w = Math.max(2, r.value / max * (iw - 110));
      svg.appendChild(el("rect", { x: M.l, y: y + 18, width: iw, height: 11, rx: 0, fill: "var(--line)", opacity: ".45" }));
      svg.appendChild(el("rect", { x: M.l, y: y + 18, width: w, height: 11, fill: r.cls === "warn" ? "var(--amber)" : r.cls === "bad" ? "var(--red)" : "var(--cyan)" }));
      svg.appendChild(txt(M.l + w + 9, y + 28, (r.value.toFixed(r.dec == null ? 1 : r.dec)) + (s.unit || ""), "anno"));
    });
    svg.setAttribute("viewBox", "0 0 " + W + " " + (top + s.rows.length * rowH + 10));
  }

  var KIND = { lines: lines, scatter: scatter, paired: paired, dumbbell: dumbbell, hbars: hbars };
  var boxes = document.querySelectorAll("[data-chart]");
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    var spec;
    try { spec = JSON.parse(box.getAttribute("data-spec")); } catch (e) { continue; }
    try {
      var svg = el("svg", {
        "class": "chart", viewBox: "0 0 " + W + " " + ((spec.kind === "paired" || spec.kind === "hbars") ? 150 : H),
        role: "img", "aria-label": spec.aria || ""
      });
      (KIND[spec.kind] || lines)(svg, spec);
      box.textContent = "";
      box.appendChild(svg);
    } catch (e) { /* leave the <noscript>/table fallback in place */ }
  }
})();
