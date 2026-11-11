import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { shortDate, parseDate } from "@/lib/dates";

type Point = { date: string; value: number };

/** Smooth neon line chart with gradient fill, optional goal line, and min/max labels. */
export function LineChart({
  points,
  goal,
  height = 180,
  color,
  unit = "",
}: {
  points: Point[];
  goal?: number | null;
  height?: number;
  color?: string;
  unit?: string;
}) {
  const colors = useColors();
  const c = color ?? colors.primary;
  const [width, setWidth] = useState(0);

  const padX = 8;
  const padTop = 18;
  const padBottom = 26;
  const values = points.map((p) => p.value);
  const allVals = goal ? [...values, goal] : values;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const span = Math.max(max - min, 1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const w = width - padX * 2;
  const h = height - padTop - padBottom;
  const x = (i: number) => padX + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => padTop + h - ((v - lo) / (hi - lo)) * h;

  // Catmull-Rom → cubic bezier for a smooth path.
  const path = (() => {
    if (points.length === 0 || width === 0) return "";
    if (points.length === 1) return `M ${x(0)} ${y(points[0]!.value)}`;
    let d = `M ${x(0)} ${y(points[0]!.value)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;
      const x0 = x(Math.max(0, i - 1)), y0 = y(p0.value);
      const x1 = x(i), y1 = y(p1.value);
      const x2 = x(i + 1), y2 = y(p2.value);
      const x3 = x(Math.min(points.length - 1, i + 2)), y3 = y(p3.value);
      const cp1x = x1 + (x2 - x0) / 6, cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6, cp2y = y2 - (y3 - y1) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    return d;
  })();

  const area = path ? `${path} L ${x(points.length - 1)} ${padTop + h} L ${x(0)} ${padTop + h} Z` : "";
  const last = points[points.length - 1];
  const labelIdx = points.length <= 4 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && points.length > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={0.35} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={f}
              x1={padX}
              x2={width - padX}
              y1={padTop + h * f}
              y2={padTop + h * f}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}
          {goal ? (
            <>
              <Line
                x1={padX}
                x2={width - padX}
                y1={y(goal)}
                y2={y(goal)}
                stroke={colors.accent}
                strokeWidth={1}
                strokeDasharray="4 5"
                strokeOpacity={0.8}
              />
              <SvgText x={width - padX} y={y(goal) - 5} fill={colors.accent} fontSize={10} fontFamily={Fonts.pixel} textAnchor="end">
                GOAL {goal}
              </SvgText>
            </>
          ) : null}
          {area ? <Path d={area} fill="url(#areaGrad)" /> : null}
          <Path d={path} stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <Circle key={p.date} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 2.5} fill={i === points.length - 1 ? c : colors.background} stroke={c} strokeWidth={2} />
          ))}
          {last ? (
            <SvgText
              x={Math.min(x(points.length - 1), width - padX - 20)}
              y={Math.max(12, y(last.value) - 12)}
              fill={colors.foreground}
              fontSize={12}
              fontFamily={Fonts.bodyExtraBold}
              textAnchor="end"
            >
              {last.value}
              {unit}
            </SvgText>
          ) : null}
          {labelIdx.map((i) => (
            <SvgText
              key={i}
              x={x(i)}
              y={height - 6}
              fill={colors.mutedForeground}
              fontSize={10}
              fontFamily={Fonts.body}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            >
              {shortDate(parseDate(points[i]!.date))}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
