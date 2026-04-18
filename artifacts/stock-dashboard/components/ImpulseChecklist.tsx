import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { IMPULSE_CHECKLIST_ITEMS, IMPULSE_BLOCK_THRESHOLD } from "@/constants/rules";

interface Props {
  value:     boolean[];
  onChange:  (v: boolean[]) => void;
}

export default function ImpulseChecklist({ value, onChange }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const arr = value.length === IMPULSE_CHECKLIST_ITEMS.length
    ? value
    : new Array(IMPULSE_CHECKLIST_ITEMS.length).fill(false);

  const checked = arr.filter(Boolean).length;
  const blocked = checked >= IMPULSE_BLOCK_THRESHOLD;
  const accent  = blocked ? "#F04452" : checked > 0 ? "#F59E0B" : "#22C55E";

  const toggle = (i: number) => {
    const next = [...arr];
    next[i] = !next[i];
    onChange(next);
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>매수 전 뇌동 체크리스트</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {IMPULSE_BLOCK_THRESHOLD}개 이상 해당 시 진입 보류
        </Text>
      </View>

      {IMPULSE_CHECKLIST_ITEMS.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.row}
          onPress={() => toggle(i)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.box,
            { borderColor: arr[i] ? accent : c.separator, backgroundColor: arr[i] ? accent : "transparent" },
          ]}>
            {arr[i] && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.label, { color: c.text }]}>{item}</Text>
        </TouchableOpacity>
      ))}

      <View style={[
        styles.summary,
        { backgroundColor: blocked ? "#F0445218" : isDark ? "#1C1C1E" : "#F2F2F7" },
      ]}>
        <Text style={[styles.summaryText, { color: accent }]}>
          체크: {checked}/{IMPULSE_CHECKLIST_ITEMS.length}
          {blocked && " · 진입 보류 권장 · 48시간 쿨다운"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:         { borderRadius: 14, padding: 16, gap: 10 },
  header:       { gap: 2, marginBottom: 4 },
  title:        { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle:     { fontSize: 12 },
  row:          { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 6 },
  box:          {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  label:        { fontSize: 13, lineHeight: 19, flex: 1 },
  summary:      { borderRadius: 8, padding: 10, marginTop: 6 },
  summaryText:  { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
