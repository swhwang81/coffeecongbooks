"use client";

import { useMemo, useState, useRef } from "react";

export interface ViewsChartPoint {
  date: string; // "MM/DD"
  isoDate: string;
  count: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

function niceMax(value: number) {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function ViewsChart({ data }: { data: ViewsChartPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { linePath, areaPath, points, yTicks } = useMemo(() => {
    const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const max = niceMax(Math.max(...data.map((d) => d.count), 0));

    const pts = data.map((d, i) => {
      const x = data.length > 1 ? PAD_LEFT + (i / (data.length - 1)) * innerWidth : PAD_LEFT + innerWidth / 2;
      const y = PAD_TOP + innerHeight - (max === 0 ? 0 : (d.count / max) * innerHeight);
      return { x, y, ...d };
    });

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    const baseline = PAD_TOP + innerHeight;
    const area =
      pts.length > 0
        ? `M ${pts[0].x.toFixed(2)} ${baseline} ` +
          pts.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
          ` L ${pts[pts.length - 1].x.toFixed(2)} ${baseline} Z`
        : "";

    const ticks = [0, 0.5, 1].map((t) => ({
      value: Math.round(max * t),
      y: PAD_TOP + innerHeight - t * innerHeight,
    }));

    return { linePath: line, areaPath: area, points: pts, yMax: max, yTicks: ticks };
  }, [data]);

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  // Show at most ~6 x-axis labels so dates never crowd/overlap.
  const labelStride = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label="기간별 조회수 추이"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* gridlines */}
        {yTicks.map((tick) => (
          <line
            key={tick.value}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--color-ink)"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* y-axis labels */}
        {yTicks.map((tick) => (
          <text key={tick.value} x={PAD_LEFT - 8} y={tick.y + 4} textAnchor="end" fontSize={11} fill="var(--color-ink)" fillOpacity={0.5}>
            {tick.value.toLocaleString()}
          </text>
        ))}

        {/* area + line */}
        {points.length > 0 && (
          <>
            <path d={areaPath} fill="var(--color-accent)" fillOpacity={0.1} stroke="none" />
            <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* x-axis labels */}
        {points.map((p, i) =>
          i % labelStride === 0 || i === points.length - 1 ? (
            <text key={p.isoDate} x={p.x} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--color-ink)" fillOpacity={0.5}>
              {p.date}
            </text>
          ) : null
        )}

        {/* end marker */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            fill="var(--color-accent)"
            stroke="var(--color-paper-card)"
            strokeWidth={2}
          />
        )}

        {/* crosshair + hover marker */}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--color-ink)"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--color-accent)" stroke="var(--color-paper-card)" strokeWidth={2} />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-ink/10 bg-paper-card px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: `${(hovered.y / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-ink/50">{hovered.isoDate}</div>
          <div className="font-semibold text-ink">조회 {hovered.count.toLocaleString()}회</div>
        </div>
      )}

      {/* Accessible data table, same series, kept off-screen visually. */}
      <table className="sr-only">
        <caption>기간별 조회수 추이</caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">조회수</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.isoDate}>
              <td>{d.isoDate}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
