import React from "react";
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useEarnings } from "@/hooks/useEarnings";

interface Props {
  ticker: string;
  market: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function tone(days: number | null): { color: string; label: string; icon: any } {
  if (days == null)        return { color: "#94A3B8", label: "예정 없음", icon: "calendar-outline" };
  if (days < 0)            return { color: "#94A3B8", label: `${Math.abs(days)}일 전`, icon: "checkmark-done-outline" };
  if (days === 0)          return { color: "#EF4444", label: "오늘 발표", icon: "alert-circle" };
  if (days <= 1)           return { color: "#EF4444", label: `D-${days} 임박`, icon: "warning" };
  if (days <= 3)           return { color: "#F59E0B", label: `D-${days}`,      icon: "time" };
  if (days <= 7)           return { color: "#0064FF", label: `D-${days}`,      icon: "calendar" };
  return                          { color: "#22C55E", label: `D-${days}`,      icon: "calendar-outline" };
}

export default function EarningsBadge({ ticker, market }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { data, loading } = useEarnings(ticker, market);

  if (loading && !data) {
    return (
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <ActivityIndicator size="small" color={c.textTertiary} />
        <Text style={[styles.label, { color: c.textTertiary }]}>실적 일정 불러오는 중…</Text>
      </View>
    );
  }
  if (!data) return null;

  const days = data.daysUntilEarnings;
  const t = tone(days);
  const exDays = data.daysUntilExDividend;

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={[styles.iconWrap, { backgroundColor: t.color + "20" }]}>
        <Ionicons name={t.icon} size={16} color={t.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]}>다가오는 실적</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {formatDate(data.nextEarningsDate)}{data.nextEarningsDate ? ` · ${t.label}` : ""}
        </Text>
      </View>
      {exDays != null && exDays >= 0 && exDays <= 30 && (
        <View style={[styles.divBadge, { backgroundColor: c.backgroundTertiary }]}>
          <Text style={[styles.divLabel, { color: c.textTertiary }]}>배당락</Text>
          <Text style={[styles.divDay, { color: c.text }]}>D-{exDays}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 12 },
  iconWrap:{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  subtitle:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  label:   { fontSize: 12, fontFamily: "Inter_400Regular" },
  divBadge:{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  divLabel:{ fontSize: 9, fontFamily: "Inter_500Medium", marginBottom: 1 },
  divDay:  { fontSize: 12, fontFamily: "Inter_700Bold" },
});
