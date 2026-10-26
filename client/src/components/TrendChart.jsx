import { useEffect, useRef, useState } from 'react';
import { formatDate, formatPercent } from '../api.js';

// Kept in sync with the column header so its date labels line up with the plot.
export const CHART_MARGIN = { top: 8, right: 12, bottom: 8, left: 30 };
const HEIGHT = 76;
const Y_TICKS = [0, 50, 100];
const MAX_DOTS = 24; // beyond this, only the active and latest points get a dot

const dayMs = (iso) => Date.parse(`${iso}T00:00:00Z`);

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * One student's scores over time. Every row shares the same date domain and a
 * fixed 0-100% scale, so lines can be compared down the table.
 */
export default function TrendChart({ tests, domain, studentName }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [active, setActive] = useState(null);

  const { top, right, bottom, left } = CHART_MARGIN;
  const innerW = Math.max(0, width - left - right);
  const innerH = HEIGHT - top - bottom;
  const from = dayMs(domain.from);
  const span = dayMs(domain.to) - from;

  const x = (iso) => left + (span > 0 ? ((dayMs(iso) - from) / span) * innerW : innerW / 2);
  const y = (pct) => top + (1 - pct / 100) * innerH;
  const points = tests.map((t) => ({ ...t, px: x(t.testDate), py: y(t.percentage) }));
  const last = points.length - 1;

  const linePath = points.map((p, i) => `${i ? 'L' : 'M'}${p.px},${p.py}`).join('');
  const areaPath = points.length > 1
    ? `${linePath}L${points[last].px},${y(0)}L${points[0].px},${y(0)}Z`
    : '';

  function nearestIndex(clientX) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.px - px) < Math.abs(points[best].px - px)) best = i;
    });
    return best;
  }

  function onKeyDown(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in moves) {
      e.preventDefault();
      setActive((i) => Math.min(last, Math.max(0, (i ?? last) + moves[e.key])));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(last);
    }
  }

  const first = tests[0];
  const latest = tests[last];
  const label = tests.length === 1
    ? `${studentName}: one test, ${formatPercent(latest.percentage)} on ${formatDate(latest.testDate)}`
    : `${studentName}: ${tests.length} tests, from ${formatPercent(first.percentage)} on ${formatDate(first.testDate)} to ${formatPercent(latest.percentage)} on ${formatDate(latest.testDate)}. Use arrow keys to read each score.`;

  const activePoint = active === null ? null : points[active];
  const showAllDots = points.length <= MAX_DOTS;

  return (
    <div
      ref={wrapRef}
      className="trend"
      tabIndex={0}
      role="group"
      aria-label={label}
      onPointerMove={(e) => width && setActive(nearestIndex(e.clientX))}
      onPointerDown={(e) => width && setActive(nearestIndex(e.clientX))}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive(last)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true">
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line className="trend-grid" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} />
              <text className="trend-tick" x={left - 6} y={y(tick)} dy="0.32em" textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {activePoint && (
            <line className="trend-crosshair" x1={activePoint.px} x2={activePoint.px} y1={top} y2={HEIGHT - bottom} />
          )}
          {areaPath && <path className="trend-area" d={areaPath} />}
          {points.length > 1 && <path className="trend-line" d={linePath} />}
          {points.map((p, i) =>
            showAllDots || i === last || i === active ? (
              <circle key={i} className="trend-dot" cx={p.px} cy={p.py} r={i === active ? 5 : 4} />
            ) : null
          )}
        </svg>
      )}
      {activePoint && (
        <div
          className="trend-tooltip"
          role="status"
          style={{ left: Math.min(Math.max(activePoint.px, 70), width - 70) }}
        >
          <strong>{formatPercent(activePoint.percentage)}</strong>
          <span>{activePoint.testName || 'Test'} · {formatDate(activePoint.testDate)}</span>
        </div>
      )}
    </div>
  );
}
