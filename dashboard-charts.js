// Small dependency-free SVG line chart for the admin Home tab.
//   PurebaricCharts.lineChart(container, { series, format, ariaLabel })
// series: [{ label, values: [12 numbers|null], emphasis: true|false }]. The first
// Optional: labels (one per point, any length; used for the readout) and ticks ([{ i, label }]) for the
// x axis — without them the chart is the 12-month one. alwaysLegend shows the legend even for one line.
// series is the emphasised one (accent colour, end marker + direct label); any
// others are context (muted, dashed). Calling it again on the same container
// updates the data. Colours come from CSS custom properties (--viz-*), so the
// stylesheet owns the palette.
(function (root) {
  'use strict';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const NS = 'http://www.w3.org/2000/svg';
  const HEIGHT = 230;

  function niceCeil(max) {
    if (!(max > 0)) return { top: 4, step: 1 };
    const rough = max / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s * 4 >= max) || 10 * pow;
    return { top: step * 4, step };
  }

  function svg(tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    if (text != null) el.textContent = text;
    return el;
  }

  function lineChart(container, opts) {
    container._vizOpts = opts;
    if (container._vizInit) { container._vizDraw(); return; }
    container._vizInit = true;

    const legend = document.createElement('div');
    legend.className = 'viz-legend';
    const plot = document.createElement('div');
    plot.className = 'viz-plot';
    // Phones ignore touch-action on SVG children, so the rule lives on this HTML wrapper: a finger sliding
    // sideways scrubs the chart, a vertical swipe still scrolls the page (same as the rental calendar).
    plot.style.touchAction = 'pan-y';
    const tip = document.createElement('div');
    tip.className = 'viz-tip';
    tip.hidden = true;
    container.append(legend, plot);

    let geo = null;
    let focusIdx = null;

    function hideTip() { tip.hidden = true; const g = plot.querySelector('.viz-cross'); if (g) g.style.display = 'none'; }

    function showAt(idx) {
      const o = container._vizOpts;
      const g = plot.querySelector('.viz-cross');
      if (!g || !geo) return;
      const x = geo.x(idx);
      g.style.display = '';
      g.querySelector('line').setAttribute('x1', x);
      g.querySelector('line').setAttribute('x2', x);
      [...g.querySelectorAll('circle')].forEach((c, i) => {
        const v = o.series[i] && o.series[i].values[idx];
        if (v == null) { c.style.display = 'none'; return; }
        c.style.display = '';
        c.setAttribute('cx', x);
        c.setAttribute('cy', geo.y(v));
      });
      tip.replaceChildren();
      const head = document.createElement('div');
      head.className = 'viz-tip-head';
      head.textContent = o.labels ? o.labels[idx] : MONTHS[idx];
      tip.appendChild(head);
      o.series.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'viz-tip-row';
        const key = document.createElement('span');
        key.className = 'viz-tip-key' + (i === 0 ? '' : ' prev');
        const val = document.createElement('strong');
        val.textContent = s.values[idx] == null ? 'No data' : o.format(s.values[idx]);
        const name = document.createElement('span');
        name.className = 'viz-tip-name';
        name.textContent = s.label;
        row.append(key, val, name);
        tip.appendChild(row);
      });
      tip.hidden = false;
      const w = tip.offsetWidth;
      const left = x + 14 + w > geo.W ? x - 14 - w : x + 14;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = '8px';
    }

    function draw() {
      const o = container._vizOpts;
      const W = Math.round(plot.clientWidth || container.clientWidth);
      if (!W) return;
      const narrow = W < 440;
      const m = { t: 14, r: narrow ? 50 : 64, b: 26, l: narrow ? 42 : 52 };
      const pw = W - m.l - m.r, ph = HEIGHT - m.t - m.b;
      const all = o.series.flatMap((s) => s.values).filter((v) => v != null);
      const { top, step } = niceCeil(Math.max(0, ...all));
      const n = o.labels ? o.labels.length : 12;
      const x = (i) => m.l + (pw * i) / Math.max(1, n - 1);
      const y = (v) => m.t + ph - (v / top) * ph;
      geo = { W, x, y };

      legend.replaceChildren();
      if (o.series.length > 1 || o.alwaysLegend) {
        o.series.forEach((s, i) => {
          const item = document.createElement('span');
          item.className = 'viz-legend-item';
          const key = document.createElement('span');
          key.className = 'viz-tip-key' + (i === 0 ? '' : ' prev');
          item.append(key, document.createTextNode(s.label));
          legend.appendChild(item);
        });
      }

      const svgEl = svg('svg', { width: W, height: HEIGHT, viewBox: `0 0 ${W} ${HEIGHT}`, role: 'img', 'aria-label': o.ariaLabel || '', tabindex: 0, class: 'viz-svg', style: 'touch-action: pan-y;' });
      for (let t = 0; t * step <= top + 1e-9; t += 1) {
        const v = t * step;
        svgEl.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'viz-grid' }));
        svgEl.appendChild(svg('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'viz-axis' }, o.axisFormat ? o.axisFormat(v) : o.format(v)));
      }
      const ticks = o.ticks || MONTHS.map((mo, i) => ({ i, label: mo }));
      ticks.forEach((t, k) => {
        if (narrow && k % 2 === 1) return;
        svgEl.appendChild(svg('text', { x: x(t.i), y: HEIGHT - 6, 'text-anchor': 'middle', class: 'viz-axis' }, t.label));
      });

      const path = (vals) => {
        let d = '', pen = false;
        vals.forEach((v, i) => {
          if (v == null) { pen = false; return; }
          d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
          pen = true;
        });
        return d;
      };
      // Context series first so the emphasised line sits on top.
      for (let i = o.series.length - 1; i >= 0; i -= 1) {
        const d = path(o.series[i].values);
        if (d) svgEl.appendChild(svg('path', { d, class: i === 0 ? 'viz-line' : 'viz-line prev' }));
      }
      const main = o.series[0].values;
      let last = -1;
      main.forEach((v, i) => { if (v != null) last = i; });
      if (last >= 0) {
        svgEl.appendChild(svg('circle', { cx: x(last), cy: y(main[last]), r: 4.5, class: 'viz-end' }));
        svgEl.appendChild(svg('text', { x: x(last) + 10, y: y(main[last]) + 4, class: 'viz-endlabel' }, o.format(main[last])));
      }

      const cross = svg('g', { class: 'viz-cross', style: 'display:none' });
      cross.appendChild(svg('line', { y1: m.t, y2: m.t + ph, class: 'viz-crossline' }));
      o.series.forEach((s, i) => cross.appendChild(svg('circle', { r: 4.5, class: i === 0 ? 'viz-end' : 'viz-end prev' })));
      svgEl.appendChild(cross);
      const hit = svg('rect', { x: m.l - 10, y: 0, width: pw + 20, height: HEIGHT - m.b + 6, fill: 'transparent', class: 'viz-hit', style: 'touch-action: pan-y; cursor: crosshair;' });
      svgEl.appendChild(hit);

      const idxFromEvent = (e) => {
        const r = svgEl.getBoundingClientRect();
        return Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - m.l) / pw) * (n - 1))));
      };
      const onMove = (e) => { if (e.pointerType !== 'mouse' || e.buttons || e.target === hit) { focusIdx = idxFromEvent(e); showAt(focusIdx); } };
      svgEl.addEventListener('pointermove', onMove);
      // Capture the pointer on press so a finger sliding across the chart keeps scrubbing days (touch
      // would otherwise hand the gesture to the page after the first move).
      svgEl.addEventListener('pointerdown', (e) => { try { svgEl.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } focusIdx = idxFromEvent(e); showAt(focusIdx); });
      svgEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
      svgEl.addEventListener('pointercancel', hideTip);
      svgEl.addEventListener('blur', hideTip);
      svgEl.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const start = focusIdx == null ? Math.max(last, 0) : focusIdx;
        focusIdx = Math.max(0, Math.min(n - 1, start + (e.key === 'ArrowRight' ? 1 : -1)));
        showAt(focusIdx);
      });

      tip.hidden = true; // a redraw rebuilds the crosshair, so drop any stale readout
      plot.replaceChildren(svgEl, tip);
    }

    container._vizDraw = draw;
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(plot);
    draw();
  }

  root.PurebaricCharts = { lineChart };
})(typeof window !== 'undefined' ? window : globalThis);

// ─── Booking funnel drop-off widget ───
// Self-contained: injects its card into the Site analytics tab on page load and pulls
// funnel numbers from /api/admin/ga-funnel. It lives here (rather than inline in
// admin.html) so the widget ships as one module. Home vs business is split by the
// booking page URL (/book vs /book?type=business), so no GA4 custom dimensions needed.
(function (root) {
  'use strict';

  var STAGES = [
    ['booking_form_start', 'Form started'],
    ['service_area_check', 'Area checked'],
    ['select_rental_plan', 'Plan selected'],
    ['select_delivery_date', 'Date selected'],
    ['booking_request_submit', 'Booking submitted'],
  ];
  var seg = 'home';
  var data = null;

  function esc(s) {
    if (typeof root.escape === 'function') { try { return root.escape(s); } catch (e) { /* fall through */ } }
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fetchJson(path) {
    if (typeof root.api === 'function') return root.api(path);
    return fetch(path, { headers: { 'Content-Type': 'application/json' } }).then(function (r) {
      return r.text().then(function (t) { return t ? JSON.parse(t) : {}; });
    });
  }

  function cardHtml() {
    return '' +
    '<div class="viz-card viz an-card" id="funnelCard">' +
      '<h3>Booking funnel drop-off</h3>' +
      '<p class="viz-note">Where reservation requests fall off, for home and business rentals. Last 30 days.</p>' +
      '<div class="seg" role="group" aria-label="Rental type" style="margin:10px 0 4px;">' +
        '<button type="button" data-f="home" class="on">Home rentals</button>' +
        '<button type="button" data-f="business">Business rentals</button>' +
      '</div>' +
      '<div id="funnelBody"><div class="renter-line">Loading…</div></div>' +
      '<div class="renter-line" id="funnelMeta" style="margin-top:8px;"></div>' +
      '<div style="margin-top:8px;"><button type="button" class="btn btn-ghost btn-sm" id="funnelRefresh">Refresh funnel</button></div>' +
    '</div>' +
    '<style>' +
      '.funnel-callout{background:#fdf6ec;border:1px solid #ecd9b8;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:.92rem;}' +
      '.funnel-drop{margin:2px 0 0 2.2em;font-size:.78rem;color:var(--stone-muted,#8a7f74);}' +
      '.funnel-stats{margin-top:10px;}' +
    '</style>';
  }

  function inject() {
    var panel = document.querySelector('[data-panel="analytics"]');
    if (!panel || document.getElementById('funnelCard')) return false;
    panel.insertAdjacentHTML('beforeend', cardHtml());
    panel.querySelectorAll('#funnelCard [data-f]').forEach(function (b) {
      b.addEventListener('click', function () { setSeg(b.getAttribute('data-f')); });
    });
    var rb = document.getElementById('funnelRefresh');
    if (rb) rb.addEventListener('click', function () { load(true); });
    return true;
  }

  function setSeg(s) {
    seg = s === 'business' ? 'business' : 'home';
    document.querySelectorAll('#funnelCard [data-f]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-f') === seg);
    });
    render();
  }

  function load(refresh) {
    var body = document.getElementById('funnelBody');
    if (body && refresh) body.innerHTML = '<div class="renter-line">Refreshing…</div>';
    return fetchJson('/api/admin/ga-funnel' + (refresh ? '?refresh=1' : '')).then(function (r) {
      data = r; render();
    }).catch(function (e) {
      if (body) body.innerHTML = '<div class="renter-line">Could not load funnel data: ' + esc((e && e.message) || e) + '</div>';
    });
  }

  function metaHtml(r) {
    var when = r.fetchedAt ? new Date(r.fetchedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    return 'Source: Google Analytics · last 30 days' + (when ? ' · updated ' + esc(when) : '') +
      (r.stale ? ' · <span style="color:#9a4f3a;">showing the last good copy, refresh failed: ' + esc(String(r.stale)) + '</span>' : '');
  }

  function render() {
    var body = document.getElementById('funnelBody'), meta = document.getElementById('funnelMeta');
    if (!body) return;
    var r = data;
    if (!r) { body.innerHTML = '<div class="renter-line">Loading…</div>'; return; }
    if (!r.configured) {
      body.innerHTML = '<div class="renter-line">Connect Google Analytics (service account) to see funnel drop-off. The booking events are already being recorded.</div>';
      if (meta) meta.innerHTML = '';
      return;
    }
    if (r.error && !r.funnel) {
      body.innerHTML = '<div class="renter-line">Google Analytics returned an error: ' + esc(r.error) + '</div>';
      return;
    }
    var counts0 = (r.funnel && r.funnel[seg]) || {};
    var counts = STAGES.map(function (st) { return counts0[st[0]] || 0; });
    var started = counts[0];
    var segName = seg === 'business' ? 'business' : 'home';
    function fmt(n) { return n.toLocaleString('en-US'); }
    if (!started) {
      body.innerHTML = '<div class="renter-line">No booking funnel activity in the last 30 days for ' + segName + ' rentals.</div>';
      if (meta) meta.innerHTML = metaHtml(r);
      return;
    }
    var worst = null;
    var rows = STAGES.map(function (st, i) {
      var c = counts[i], pct = Math.round((c / started) * 100), drop = null;
      if (i > 0 && counts[i - 1] > 0) {
        drop = Math.round(((counts[i - 1] - c) / counts[i - 1]) * 100);
        if (worst === null || drop > worst.drop) worst = { from: STAGES[i - 1][1], to: st[1], drop: drop };
      }
      return { label: st[1], count: c, pct: pct, drop: drop, width: Math.max(2, Math.round((c / started) * 100)) };
    });
    var abandoned = counts0['booking_form_abandon'] || 0;
    var errors = counts0['booking_request_error'] || 0;
    var submitted = counts[counts.length - 1];
    var overall = Math.round((submitted / started) * 100);
    var html = '';
    if (worst && worst.drop > 0) {
      html += '<div class="funnel-callout">Biggest drop-off: <strong>' + esc(worst.from) + ' → ' + esc(worst.to) + '</strong> — ' + worst.drop + '% of visitors who got that far didn’t continue.</div>';
    }
    html += '<ol class="an-top">';
    rows.forEach(function (s, i) {
      html += '<li>' +
        '<div class="an-top-row"><span class="an-top-rank">' + (i + 1) + '</span><strong class="an-top-name">' + esc(s.label) + '</strong>' +
        '<span class="an-top-n">' + fmt(s.count) + ' <span style="color:var(--stone-muted,#8a7f74)">(' + s.pct + '% of starters)</span></span></div>' +
        '<div class="an-top-bar"><div style="width:' + s.width + '%' + (i === rows.length - 1 ? ';background:#2e7d6f' : '') + '"></div></div>' +
        (s.drop != null && s.drop > 0 ? '<div class="funnel-drop">' + s.drop + '% didn’t continue past the previous step</div>' : '') +
      '</li>';
    });
    html += '</ol>' +
      '<div class="renter-line funnel-stats">' + fmt(submitted) + ' bookings from ' + fmt(started) + ' started forms (' + overall + '% overall) · ' +
      fmt(abandoned) + ' left without submitting · ' + fmt(errors) + ' hit an error.</div>';
    body.innerHTML = html;
    if (meta) meta.innerHTML = metaHtml(r);
  }

  function init() {
    if (!inject()) return;
    load(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.PurebaricFunnel = { reload: function () { load(true); } };
})(typeof window !== 'undefined' ? window : globalThis);

/* ─── Admin reviews: star-rating display ───
   Wraps the inline renderReviews() in admin.html (which this file cannot edit
   directly) to show each review's star rating in the approval table, so the
   rating is visible during moderation before a review is published. */
(function () {
  function starsHtml(n) {
    n = parseInt(n, 10);
    if (!(n >= 1 && n <= 5)) return '<span style="color:#8a7f74;font-size:12px">no rating</span>';
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return '<span style="color:#d99a2b;letter-spacing:1px" title="' + n + ' out of 5 stars">' + s + '</span>';
  }
  function decorate() {
    try {
      if (typeof _reviews === 'undefined' || !_reviews) return;
      var list = document.getElementById('reviewsList');
      if (!list) return;
      // Mirror the inline filter so rows line up with the rendered table.
      var rvq = (document.getElementById('reviewSearch') || {}).value || '';
      var shown = _reviews.filter(function (r) {
        return window.PurebaricAdminUtils && window.PurebaricAdminUtils.matchesSearch(
          rvq, [r.firstName, r.lastInitial, r.city, r.text]);
      });
      var rows = list.querySelectorAll('tbody tr');
      rows.forEach(function (tr, i) {
        var rv = shown[i];
        if (!rv || tr.dataset.starsDone) return;
        tr.dataset.starsDone = '1';
        var tds = tr.querySelectorAll('td');
        if (tds[1]) {
          var d = document.createElement('div');
          d.style.marginTop = '3px';
          d.innerHTML = starsHtml(rv.stars);
          tds[1].appendChild(d);
        }
      });
    } catch (e) { /* never break the admin reviews tab */ }
  }
  function init() {
    try {
      if (typeof window.renderReviews === 'function' && !window.renderReviews._starsWrapped) {
        var orig = window.renderReviews;
        var wrapped = function () { orig(); decorate(); };
        wrapped._starsWrapped = true;
        window.renderReviews = wrapped;
        decorate(); // in case the table already rendered
      }
    } catch (e) { /* never break the admin page */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
