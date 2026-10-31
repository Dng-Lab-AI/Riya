"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Domain, Point } from "@/lib/progress";

// Animations always start from the same state on the server and in the browser;
// with "reduce motion" they simply take no time.

// Small, dependency-free charts for the progress dashboards. One hue (forest green)
// for every series, thin marks, hairline grid, a tooltip on hover and keyboard focus,
// and a table view so no value depends on hovering.

const INK = "var(--color-forest-600)";
const INK_HOVER = "var(--color-forest-800)";
const GRID = "var(--color-sand-200)";
const SURFACE = "#ffffff";

type Format = (value: number) => string;
const number = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v);

// Server pages cannot hand functions to these client charts, so they name a unit instead.
export type Unit = "nombre" | "euro" | "cours";
const FORMATS: Record<Unit, Format> = {
  nombre: number,
  euro: (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: v % 1 ? 2 : 0 }).format(v),
  cours: (v) => `${number(v)} cours`,
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

// Rounded, readable axis maximum whose half is a clean number too: 0 / 1 / 2, 0 / 3 / 6, 0 / 20 / 40…
function niceMax(max: number) {
  if (max <= 10) return Math.max(2, Math.ceil(max / 2) * 2);
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 4, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

function Tooltip({ x, y, value, label }: { x: number; y: number; value: string; label?: string }) {
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-earth-900 px-3 py-2 text-center shadow-lg" style={{ left: x, top: y - 10 }}>
      <p className="text-sm font-semibold text-white">{value}</p>
      {label && <p className="text-xs text-sand-300">{label}</p>}
    </div>
  );
}

function YAxis({ ticks, scale, width, left, format }: { ticks: number[]; scale: (v: number) => number; width: number; left: number; format: Format }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={width} y1={scale(t)} y2={scale(t)} stroke={GRID} strokeWidth={1} />
          <text x={left - 8} y={scale(t)} dy="0.32em" textAnchor="end" className="fill-earth-400 text-[11px] tabular-nums">{format(t)}</text>
        </g>
      ))}
    </g>
  );
}

// Keeps at most ~6 labels along the x axis, always including the last one, never two side by side.
const showLabel = (i: number, n: number) => {
  const every = Math.ceil(n / 6);
  return i === n - 1 || (i % every === 0 && n - 1 - i >= every);
};

export function ColumnChart({ data, unit = "nombre", height = 200, label }: { data: Point[]; unit?: Unit; height?: number; label: string }) {
  const format = FORMATS[unit];
  const { ref, width } = useWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 24, right: 8, bottom: 26, left: 36 };
  const innerW = Math.max(0, width - m.left - m.right);
  const base = height - m.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value ?? 0)));
  const scale = (v: number) => base - (v / max) * (base - m.top);
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, band * 0.62);
  const last = data.length - 1;
  const peak = data.reduce((best, d, i) => ((d.value ?? 0) > (data[best]?.value ?? 0) ? i : best), 0);

  return (
    <figure>
      <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            <YAxis ticks={[0, max / 2, max]} scale={scale} width={width - m.right} left={m.left} format={format} />
            {data.map((d, i) => {
              const v = d.value ?? 0;
              const cx = m.left + band * i + band / 2;
              const x = cx - barW / 2;
              const y = scale(v);
              const r = Math.min(4, base - y);
              const path = `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${base} Z`;
              return (
                <g key={i}>
                  {v > 0 && (
                    <motion.path
                      d={path}
                      fill={active === i ? INK_HOVER : INK}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.6, delay: i * 0.035, ease: "easeOut" }}
                      style={{ originY: 1 }}
                    />
                  )}
                  {v > 0 && (i === last || i === peak) && active !== i && (
                    <text x={cx} y={y - 6} textAnchor="middle" className="fill-earth-700 text-[11px] font-semibold">{format(v)}</text>
                  )}
                  {showLabel(i, data.length) && <text x={cx} y={height - 6} textAnchor="middle" className="fill-earth-400 text-[11px]">{d.label}</text>}
                  {/* The whole column is the hit target, not just the painted bar. */}
                  <rect
                    x={m.left + band * i}
                    y={m.top}
                    width={band}
                    height={base - m.top}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.hint ?? d.label} : ${format(v)}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="cursor-default outline-none"
                  />
                </g>
              );
            })}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tooltip x={m.left + band * active + band / 2} y={scale(data[active].value ?? 0)} value={format(data[active].value ?? 0)} label={data[active].hint ?? data[active].label} />
        )}
      </div>
      <DataTable data={data} format={format} caption={label} />
    </figure>
  );
}

export function AreaChart({ data, unit = "nombre", height = 200, label, domain }: { data: Point[]; unit?: Unit; height?: number; label: string; domain?: [number, number] }) {
  const format = FORMATS[unit];
  const { ref, width } = useWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 24, right: 40, bottom: 26, left: 36 };
  const base = height - m.bottom;
  const [min, max] = domain ?? [0, niceMax(Math.max(...data.map((d) => d.value ?? 0)))];
  const scale = (v: number) => base - ((v - min) / (max - min)) * (base - m.top);
  const step = data.length > 1 ? (width - m.left - m.right) / (data.length - 1) : 0;
  const xOf = (i: number) => (data.length > 1 ? m.left + step * i : m.left + (width - m.left - m.right) / 2);

  // A gap in the data (null) breaks the line instead of pretending to be zero.
  const segments: { i: number; v: number }[][] = [];
  data.forEach((d, i) => {
    if (d.value === null) return;
    const prev = segments.at(-1);
    if (prev && prev.at(-1)!.i === i - 1) prev.push({ i, v: d.value });
    else segments.push([{ i, v: d.value }]);
  });
  const line = (seg: { i: number; v: number }[]) => seg.map((p, k) => `${k ? "L" : "M"}${xOf(p.i)},${scale(p.v)}`).join(" ");
  const area = (seg: { i: number; v: number }[]) => `${line(seg)} L${xOf(seg.at(-1)!.i)},${base} L${xOf(seg[0].i)},${base} Z`;
  const lastPoint = segments.at(-1)?.at(-1);
  const ticks = domain ? [min, (min + max) / 2, max] : [0, max / 2, max];

  const onMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = data.length > 1 ? Math.round((e.clientX - rect.left - m.left) / step) : 0;
    setActive(Math.max(0, Math.min(data.length - 1, i)));
  };
  const activeValue = active === null ? null : data[active].value;

  return (
    <figure>
      <div ref={ref} className="relative" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label}>
            <YAxis ticks={ticks} scale={scale} width={width - m.right} left={m.left} format={format} />
            {data.map((d, i) => showLabel(i, data.length) && (
              <text key={i} x={xOf(i)} y={height - 6} textAnchor="middle" className="fill-earth-400 text-[11px]">{d.label}</text>
            ))}
            {segments.map((seg, k) => (
              <g key={k}>
                <motion.path d={area(seg)} fill={INK} fillOpacity={0.1} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={reduce ? { duration: 0 } : { duration: 0.8, delay: 0.3 }} />
                {/* A point with no neighbour (a lone month) still gets its dot. */}
                {seg.length === 1 && seg[0] !== lastPoint && <circle cx={xOf(seg[0].i)} cy={scale(seg[0].v)} r={4} fill={INK} stroke={SURFACE} strokeWidth={2} />}
                {seg.length > 1 && (
                  <motion.path d={line(seg)} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={reduce ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }} />
                )}
              </g>
            ))}
            {lastPoint && (
              <>
                <circle cx={xOf(lastPoint.i)} cy={scale(lastPoint.v)} r={4} fill={INK} stroke={SURFACE} strokeWidth={2} />
                {active === null && <text x={xOf(lastPoint.i) + 8} y={scale(lastPoint.v)} dy="0.32em" className="fill-earth-700 text-[11px] font-semibold">{format(lastPoint.v)}</text>}
              </>
            )}
            {active !== null && (
              <g>
                <line x1={xOf(active)} x2={xOf(active)} y1={m.top} y2={base} stroke="var(--color-earth-400)" strokeWidth={1} />
                {activeValue !== null && <circle cx={xOf(active)} cy={scale(activeValue)} r={5} fill={INK} stroke={SURFACE} strokeWidth={2} />}
              </g>
            )}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tooltip x={xOf(active)} y={activeValue === null ? base : scale(activeValue)} value={activeValue === null ? "Pas de donnée" : format(activeValue)} label={data[active].hint ?? data[active].label} />
        )}
      </div>
      <DataTable data={data} format={format} caption={label} />
    </figure>
  );
}

// Ranked horizontal bars, largest first, each value written at the tip.
export function BarList({ data, unit = "nombre" }: { data: Point[]; unit?: Unit }) {
  const format = FORMATS[unit];
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((d) => d.value ?? 0), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm">
          <span className="truncate text-earth-700" title={d.label}>{d.label}</span>
          <span className="flex items-center gap-2">
            <motion.span
              className="block h-3 rounded-r-[4px]"
              style={{ background: INK }}
              initial={{ width: 0 }}
              animate={{ width: `${((d.value ?? 0) / max) * 85}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
            />
            <span className="shrink-0 font-semibold tabular-nums text-earth-900">{format(d.value ?? 0)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// One indicator per learning area: a meter on a lighter track of the same green.
export function DomainMeters({ domains }: { domains: Domain[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="space-y-5">
      {domains.map((d, i) => (
        <li key={d.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.score === null ? "—" : `${d.score} %`}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest-100" role="meter" aria-label={d.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.score ?? 0}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: INK }}
              initial={{ width: 0 }}
              animate={{ width: `${d.score ?? 0}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1 text-xs text-earth-500" title={d.how}>{d.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ data, format, caption }: { data: Point[]; format: Format; caption: string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-earth-500 hover:text-earth-800">Voir les données</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <tbody className="divide-y divide-sand-200">
          {data.map((d, i) => (
            <tr key={i}>
              <td className="py-1.5 text-earth-600">{d.hint ?? d.label}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{d.value === null ? "—" : format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
