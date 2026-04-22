import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useFomc } from "@/hooks/useFomc";

interface Props {
  market: string;       // FOMC는 미국 주식에만 표시
}

function tone(days: number): { color: string; label: string; icon: any } {
  if (days <= 0)  return { color: "#EF4444", label: "오늘 결정",   icon: "alert-circle" };
  if (days <= 1)  return { color: "#EF4444", label: `D-${days} 임박`, icon: "warning" };
  if (days <= 3)  return { color: "#F59E0B", label: `D-${days}`,    icon: "time" };
  if (days <= 7)  return { color: "#0064FF", label: `D-${days}`,    icon: "calendar" };
  return                 { color: "#94A3B8", label: `D-${days}`,    icon: "calendar-outline" };
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export default function FomcBadge({ market }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const data = useFomc();

  const isUS = market === "NASDAQ" || market === "NYSE";
  if (!isUS || !data?.nextMeeting) return null;

  const m = data.nextMeeting;
  // FOMC는 14일 이내일 때만 표시
  if (m.daysUntilDecision > 14) return null;

  const t = tone(m.daysUntilDecision);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderLeftColor: t.color }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.color + "20" }]}>
        <Ionicons name={t.icon} size={15} color={t.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]}>FOMC 결정일 · {t.label}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {formatDate(m.decisionDate)} (UTC)
          {m.hasSEP ? " · 점도표(SEP) 공개" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 12, borderLeftWidth: 3 },
  iconWrap:{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  subtitle:{ fontSize: 11, fontFamily: "Inter_400Regular" },
});
