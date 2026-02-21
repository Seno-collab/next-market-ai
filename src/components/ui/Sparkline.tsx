type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** show a translucent area fill below the line */
  fill?: boolean;
};

/** Lightweight SVG sparkline — no external deps */
export default function Sparkline({
  data,
  width = 64,
  height = 28,
  color = "#34d399",
  fill = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 2; // px padding so stroke isn't clipped
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const toX = (i: number) => pad + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => pad + (1 - (v - min) / range) * innerH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  // Closed path for fill: line + bottom-right + bottom-left corners
  const fillPath =
    `M ${toX(0)},${toY(data[0])} ` +
    data.map((v, i) => `L ${toX(i)},${toY(v)}`).join(" ") +
    ` L ${toX(data.length - 1)},${height} L ${toX(0)},${height} Z`;

  const gradId = `spark-${color.replace("#", "")}-${width}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {fill && (
        <path d={fillPath} fill={`url(#${gradId})`} />
      )}

      <polyline
        points={points}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* last-point dot */}
      <circle
        cx={toX(data.length - 1)}
        cy={toY(data[data.length - 1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}
