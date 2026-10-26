"use client";

/* رسوم بيانية بسيطة اعتمادًا على SVG — بدون مكتبات خارجية */

export function AreaChart({ data }: { data: { label: string; units: number }[] }) {
  if (data.length === 0) return null;
  const width = 640;
  const height = 200;
  const pad = 28;
  const max = Math.max(...data.map((d) => d.units), 1);
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = height - pad - (d.units / max) * (height - pad * 2);
    return { x, y, ...d };
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${height - pad} L${points[0].x},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b1a1a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#8b1a1a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={width - pad}
          y1={height - pad - f * (height - pad * 2)}
          y2={height - pad - f * (height - pad * 2)}
          stroke="var(--border-line)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#8b1a1a" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#8b1a1a" />
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const DONUT_COLORS = ["#8b1a1a", "#c62828", "#ef6c00", "#1565c0", "#2e7d32", "#6a1b9a", "#00838f", "#5d4037"];

export function DonutChart({ data }: { data: { bloodType: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="py-8 text-center text-[13px] text-muted">لا توجد بيانات</p>;

  const radius = 70;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;

  // حساب الإزاحات مسبقًا دون تعديل متغير أثناء العرض
  const segments = data.reduce<{ d: { bloodType: string; count: number }; dash: number; offset: number }[]>(
    (acc, d) => {
      const dash = (d.count / total) * circumference;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ d, dash, offset });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 180 180" className="h-[180px] w-[180px] -rotate-90">
        {segments.map((seg, i) => (
          <circle
            key={seg.d.bloodType}
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset}
          />
        ))}
        <circle cx="90" cy="90" r={radius - stroke / 2 - 2} fill="var(--bg-card)" />
      </svg>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
        {data.map((d, i) => (
          <div key={d.bloodType} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="font-semibold text-ink">{d.bloodType}</span>
            <span className="text-muted">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockBar({ value, min }: { value: number; min: number }) {
  const target = Math.max(min * 2, value, 1);
  const pct = Math.min(100, (value / target) * 100);
  const color = value === 0 ? "#c62828" : value < min ? "#ef6c00" : "#2e7d32";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }} />
    </div>
  );
}
