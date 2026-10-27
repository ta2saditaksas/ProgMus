// Courbe SVG simple, échelle temporelle, couleurs issues des variables CSS.
import { dateShort, fr } from "./utils.js";

function niceTicks(min, max, n = 4) {
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const raw = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= raw);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const t = [];
  for (let v = lo; v <= hi + 1e-9; v += step) t.push(+v.toFixed(2));
  return t;
}

/** points = [{ date: "YYYY-MM-DD", value: number, label: string }] triés par date */
export function lineChart(points, { yLabel = "" } = {}) {
  const W = 440, H = 220, L = 40, R = 16, T = 24, B = 30;
  const vals = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const t = (d) => new Date(d + "T12:00:00").getTime();
  const t0 = t(points[0].date), t1 = t(points[points.length - 1].date);
  const x = (d) => (points.length === 1 ? L + (W - L - R) / 2 : L + ((t(d) - t0) / (t1 - t0 || 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(yLabel)}">`;
  s += `<text x="${L}" y="12" font-size="12" fill="var(--muted)">${esc(yLabel)}</text>`;
  for (const tk of ticks) {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(tk)}" y2="${y(tk)}" stroke="var(--line)" stroke-width="1"/>`;
    s += `<text x="${L - 8}" y="${y(tk) + 4}" text-anchor="end" font-size="13" fill="var(--muted)">${fr(tk)}</text>`;
  }
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  if (points.length > 1) {
    const last = points[points.length - 1], first = points[0];
    s += `<path d="${path} L${x(last.date).toFixed(1)} ${y(y0)} L${x(first.date).toFixed(1)} ${y(y0)} Z" fill="var(--accent)" opacity=".12"/>`;
    s += `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  points.forEach((p, i) => {
    const isLast = i === points.length - 1;
    s += `<circle cx="${x(p.date)}" cy="${y(p.value)}" r="${isLast ? 5.5 : 3.5}" fill="${isLast ? "var(--accent)" : "var(--surface)"}" stroke="var(--accent)" stroke-width="2"><title>${esc(dateShort(p.date) + " : " + p.label)}</title></circle>`;
  });
  const xl = points.length > 1 ? [points[0], points[points.length - 1]] : [points[0]];
  xl.forEach((p, i) => {
    const anchor = points.length === 1 ? "middle" : i ? "end" : "start";
    s += `<text x="${x(p.date)}" y="${H - 8}" font-size="13" fill="var(--muted)" text-anchor="${anchor}">${esc(dateShort(p.date))}</text>`;
  });
  return s + "</svg>";
}
