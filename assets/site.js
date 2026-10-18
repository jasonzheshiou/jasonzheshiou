/* Progressive enhancement only. Every page is complete and readable without this file. */
(function () {
  "use strict";

  /* ---------- theme ---------- */
  var btn = document.querySelector(".theme-btn");
  if (btn) {
    var paint = function () {
      btn.textContent = document.documentElement.dataset.theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", "Switch to " +
        (document.documentElement.dataset.theme === "dark" ? "light" : "dark") + " theme");
    };
    paint();
    btn.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
      paint();
    });
  }


  /* ---------- pixel edition ---------- */
  /* The pixel sprite is a second <symbol> set (#p-*) carried on every page. A
     <use> clone cannot be re-targeted by CSS, so switching editions means
     rewriting the href — a dozen nodes, and it is reversible. */
  var pixelOn = false;
  try {
    var qp = new URLSearchParams(location.search).get("pixel");
    if (qp !== null) { pixelOn = qp === "1"; try { localStorage.setItem("pixel", pixelOn ? "1" : "0"); } catch (e) {} }
    else { pixelOn = localStorage.getItem("pixel") === "1"; }
  } catch (e) {}

  var pixelLoading = false;
  function ensurePixelSheet(then) {
    if (document.getElementById("p-seed")) { then(); return; }
    if (pixelLoading) return;
    pixelLoading = true;
    fetch("/assets/pixel-sprite.html")
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("no sheet")); })
      .then(function (txt) {
        // parsed as HTML on purpose: the HTML parser puts <svg> in the SVG
        // namespace, which an image/svg+xml parse only does if the file
        // declares xmlns — and only SVG-namespaced elements render here.
        var doc = new DOMParser().parseFromString(txt, "text/html");
        var svg = doc.querySelector("svg");
        if (!svg || !svg.querySelector("symbol")) { pixelLoading = false; return; }
        var node = document.importNode(svg, true);
        node.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
        document.getElementById("main").appendChild(node);
        pixelLoading = false;
        then();
      })
      .catch(function () { pixelLoading = false; });
  }

  function applyPixel(on) {
    if (on && !document.getElementById("p-seed")) { ensurePixelSheet(function () { applyPixel(true); }); return; }
    document.documentElement.dataset.pixel = on ? "1" : "0";
    var uses = document.querySelectorAll("use");
    for (var i = 0; i < uses.length; i++) {
      var h = uses[i].getAttribute("href") || "";
      if (h.indexOf("#i-") === 0 && on) uses[i].setAttribute("href", "#p-" + h.slice(3));
      else if (h.indexOf("#p-") === 0 && !on) uses[i].setAttribute("href", "#i-" + h.slice(3));
    }
    var icons = document.querySelectorAll("svg.ic");
    for (var j = 0; j < icons.length; j++) {
      if (on) icons[j].classList.add("px"); else icons[j].classList.remove("px");
    }
    if (pb) { pb.setAttribute("aria-pressed", on ? "true" : "false"); pb.textContent = on ? "◼ line" : "◼ pixel"; }
  }

  var locked = document.documentElement.hasAttribute("data-pixel-lock");

  var pb = document.createElement("button");
  pb.className = "pixel-btn"; pb.type = "button";
  pb.addEventListener("click", function () {
    pixelOn = !pixelOn;
    try { localStorage.setItem("pixel", pixelOn ? "1" : "0"); } catch (e) {}
    applyPixel(pixelOn);
  });
  var nav = document.querySelector("nav.main");
  if (nav && !locked) nav.appendChild(pb);
  if (locked) { pixelOn = true; applyPixel(true); } else { applyPixel(pixelOn); }

  /* ---------- copy buttons on code blocks ---------- */
  var pres = document.querySelectorAll("pre.code");
  for (var p = 0; p < pres.length; p++) {
    (function (pre) {
      var b = document.createElement("button");
      b.className = "copy";
      b.type = "button";
      b.textContent = "copy";
      b.addEventListener("click", function () {
        var t = pre.querySelector("code");
        var text = (t || pre).innerText;
        var done = function () { b.textContent = "copied"; setTimeout(function () { b.textContent = "copy"; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
        else done();
      });
      pre.appendChild(b);
    })(pres[p]);
  }

  /* ---------- reading guide (scroll spy) ---------- */
  var links = [].slice.call(document.querySelectorAll(".toc a"));
  if (links.length && "IntersectionObserver" in window) {
    var map = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("on"); });
        var a = map["#" + en.target.id];
        if (a) a.classList.add("on");
      });
    }, { rootMargin: "-72px 0px -70% 0px" });
    links.forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;         /* "read next" links point at other pages */
      var t = document.querySelector(href);
      if (t) { map[href] = a; io.observe(t); }
    });
  }

  /* ---------- project filters ---------- */
  var chips = [].slice.call(document.querySelectorAll("[data-filter]"));
  var cards = [].slice.call(document.querySelectorAll("[data-layer]"));
  if (chips.length) {
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var want = c.getAttribute("data-filter");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        cards.forEach(function (k) {
          k.hidden = !(want === "all" || k.getAttribute("data-layer").split(" ").indexOf(want) > -1);
        });
      });
    });
  }

  /* ---------- live repo stats (best effort, never required) ---------- */
  var statTargets = [].slice.call(document.querySelectorAll("[data-repo]"));
  if (statTargets.length && !location.hostname.match(/localhost|127\./)) {
    statTargets.forEach(function (t) {
      var repo = t.getAttribute("data-repo");
      fetch("https://api.github.com/repos/" + repo, { headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j) return;
          var pushed = (j.pushed_at || "").slice(0, 7);
          var lang = j.language || "—";
          var lic = (j.license && j.license.spdx_id) || "—";
          var cell = t.querySelector("[data-stat=lang]"); if (cell) cell.textContent = lang;
          var upd = t.querySelector("[data-stat=updated]"); if (upd && pushed) upd.textContent = pushed;
          var lc = t.querySelector("[data-stat=license]"); if (lc) lc.textContent = lic === "NOASSERTION" ? "custom" : lic;
        })
        .catch(function () {});
    });
  }
})();
