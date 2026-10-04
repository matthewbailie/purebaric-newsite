// Small dependency-free SVG line chart for the admin Home tab.
//   PurebaricCharts.lineChart(container, { series, format, ariaLabel })
// series: [{ label, values: [12 numbers|null], emphasis: true|false }]. The first
// Optional: labels (one per point, any length; used for the readout) and ticks ([{ i, label }]) for the
// x axis — without them the chart is the 12-month one.
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
      if (o.series.length > 1) {
        o.series.forEach((s, i) => {
          const item = document.createElement('span');
          item.className = 'viz-legend-item';
          const key = document.createElement('span');
          key.className = 'viz-tip-key' + (i === 0 ? '' : ' prev');
          item.append(key, document.createTextNode(s.label));
          legend.appendChild(item);
        });
      }

      const svgEl = svg('svg', { width: W, height: HEIGHT, viewBox: `0 0 ${W} ${HEIGHT}`, role: 'img', 'aria-label': o.ariaLabel || '', tabindex: 0, class: 'viz-svg' });
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
      const hit = svg('rect', { x: m.l - 10, y: 0, width: pw + 20, height: HEIGHT - m.b + 6, fill: 'transparent', class: 'viz-hit' });
      svgEl.appendChild(hit);

      const idxFromEvent = (e) => {
        const r = svgEl.getBoundingClientRect();
        return Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - m.l) / pw) * (n - 1))));
      };
      hit.addEventListener('pointermove', (e) => { focusIdx = idxFromEvent(e); showAt(focusIdx); });
      hit.addEventListener('pointerdown', (e) => { focusIdx = idxFromEvent(e); showAt(focusIdx); });
      hit.addEventListener('pointerleave', hideTip);
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
