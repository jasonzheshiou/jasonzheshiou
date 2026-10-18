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
