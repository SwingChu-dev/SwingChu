import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

interface Segment {
  key:    string;
  label:  string;
  value:  number;
  color:  string;
  hint?:  string;
}

interface Props {
  title:        string;
  subtitle?:    string;
  segments:     Segment[];
  showLegend?:  boolean;
}

export default function AllocationBar({ title, subtitle, segments, showLegend = true }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const total = segments.reduce((s, x) => s + x.value, 0);
  const safeTotal = total > 0 ? total : 1;
  const empty = total <= 0;

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
        )}
      </View>

      <View style={[styles.bar, { backgroundColor: isDark ? "#2A2A2C" : "#E5E5EA" }]}>
        {!empty && segments.map((seg) => {
          const pct = (seg.value / safeTotal) * 100;
          if (pct < 0.5) return null;
          return (
            <View
              key={seg.key}
              style={{ width: `${pct}%`, backgroundColor: seg.color, height: "100%" }}
            />
          );
        })}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.key} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendLabel, { color: c.text }]} numberOfLines={1}>
                {seg.label}
              </Text>
              <Text style={[styles.legendValue, { color: c.textSecondary }]}>
                {seg.value.toFixed(1)}%
                {seg.hint ? ` · ${seg.hint}` : ""}
              </Text>
            </View>
          ))}
          {empty && (
            <Text style={[styles.empty, { color: c.textTertiary }]}>
              보유 종목이 없습니다. 매수 기록을 추가하면 비중이 표시됩니다.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { borderRadius: 14, padding: 16, gap: 12 },
  header:      { gap: 2 },
  title:       { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle:    { fontSize: 12 },
  bar:         {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  legend:      { gap: 8 },
  legendRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  dot:         { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  legendValue: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty:       { fontSize: 12, paddingVertical: 4, textAlign: "center" },
});
