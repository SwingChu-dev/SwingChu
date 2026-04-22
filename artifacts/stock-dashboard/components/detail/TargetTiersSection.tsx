import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, useColorScheme, Switch, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { USD_KRW_RATE } from "@/constants/stockData";
import { useTargetTiers, type TierKey, TIER_LABELS } from "@/context/TargetTiersContext";

interface Props {
  ticker:        string;
  market:        string;
  name:          string;
  currentPriceKRW: number;
}

const TIER_HINTS: Record<TierKey, string> = {
  tier1: "탐색 (-4% 수준)",
  tier2: "확신 (-7% 수준)",
  tier3: "기회 (목표가)",
};

const TIER_COLORS: Record<TierKey, string> = {
  tier1: "#22C55E",
  tier2: "#F59E0B",
  tier3: "#EF4444",
};

export default function TargetTiersSection({ ticker, market, name, currentPriceKRW }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { getTiers, saveTiers, clearTiers, toggleEnabled } = useTargetTiers();

  const existing = getTiers(ticker, market);
  const isUSD = market === "NASDAQ";
  const currency = isUSD ? "USD" : "KRW";
  const currencyLabel = isUSD ? "USD" : "KRW";

  const currentInDisplayCurrency = isUSD ? currentPriceKRW / USD_KRW_RATE : currentPriceKRW;

  const fmtNum = (n: number | null | undefined) => n == null ? "" : isUSD ? n.toFixed(2) : Math.round(n).toString();

  const [t1, setT1] = useState(fmtNum(existing?.tier1));
  const [t2, setT2] = useState(fmtNum(existing?.tier2));
  const [t3, setT3] = useState(fmtNum(existing?.tier3));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setT1(fmtNum(existing.tier1));
    setT2(fmtNum(existing.tier2));
    setT3(fmtNum(existing.tier3));
    setDirty(false);
  }, [existing?.updatedAt]);

  const suggest = useMemo(() => {
    const cur = currentInDisplayCurrency;
    if (!cur || isNaN(cur)) return null;
    return {
      tier1: isUSD ? +(cur * 0.96).toFixed(2) : Math.round(cur * 0.96),
      tier2: isUSD ? +(cur * 0.93).toFixed(2) : Math.round(cur * 0.93),
      tier3: isUSD ? +(cur * 0.88).toFixed(2) : Math.round(cur * 0.88),
    };
  }, [currentInDisplayCurrency, isUSD]);

  const apply = (which: TierKey, val: string) => {
    if (which === "tier1") setT1(val);
    if (which === "tier2") setT2(val);
    if (which === "tier3") setT3(val);
    setDirty(true);
  };

  const handleSave = () => {
    const parse = (s: string): number | null => {
      const n = parseFloat(s.replace(/,/g, ""));
      return isNaN(n) || n <= 0 ? null : n;
    };
    const t1n = parse(t1), t2n = parse(t2), t3n = parse(t3);
    if (t1n == null && t2n == null && t3n == null) {
      Alert.alert("타겟가를 1개 이상 입력해주세요");
      return;
    }
    saveTiers({
      ticker, market, name, currency,
      tier1: t1n, tier2: t2n, tier3: t3n,
      enabled: existing?.enabled ?? true,
    });
    setDirty(false);
  };

  const handleClear = () => {
    Alert.alert("타겟가 초기화", "이 종목의 3단계 타겟가를 모두 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => {
        clearTiers(ticker, market);
        setT1(""); setT2(""); setT3(""); setDirty(false);
      }},
    ]);
  };

  const useSuggested = () => {
    if (!suggest) return;
    setT1(String(suggest.tier1));
    setT2(String(suggest.tier2));
    setT3(String(suggest.tier3));
    setDirty(true);
  };

  const renderTier = (key: TierKey, value: string, num: number | null) => {
    const distancePct = num != null && currentInDisplayCurrency
      ? ((num - currentInDisplayCurrency) / currentInDisplayCurrency) * 100
      : null;
    const reached = num != null && currentInDisplayCurrency <= num;
    return (
      <View key={key} style={[styles.tierRow, { borderBottomColor: c.separator }]}>
        <View style={styles.tierLeft}>
          <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[key] }]} />
          <View>
            <Text style={[styles.tierLabel, { color: c.text }]}>{TIER_LABELS[key]}</Text>
            <Text style={[styles.tierHint, { color: c.textTertiary }]}>{TIER_HINTS[key]}</Text>
          </View>
        </View>
        <View style={styles.tierRight}>
          <View style={[styles.inputWrap, { backgroundColor: c.backgroundTertiary, borderColor: reached ? TIER_COLORS[key] : "transparent" }]}>
            <Text style={[styles.curSign, { color: c.textSecondary }]}>{isUSD ? "$" : "₩"}</Text>
            <TextInput
              style={[styles.input, { color: c.text }]}
              value={value}
              onChangeText={(v) => apply(key, v)}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={c.textTertiary}
            />
          </View>
          {distancePct != null && (
            <Text style={[styles.distance, {
              color: reached ? TIER_COLORS[key] : distancePct < 0 ? c.positive : c.textTertiary,
            }]}>
              {reached ? "도달" : `${distancePct >= 0 ? "+" : ""}${distancePct.toFixed(1)}%`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const t1n = parseFloat(t1) || null;
  const t2n = parseFloat(t2) || null;
  const t3n = parseFloat(t3) || null;

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>타겟가 3단계 분할 매수</Text>
          <Text style={[styles.subtitle, { color: c.textTertiary }]}>
            현재가 {isUSD ? `$${currentInDisplayCurrency.toFixed(2)}` : `₩${Math.round(currentInDisplayCurrency).toLocaleString()}`} · {currencyLabel}
          </Text>
        </View>
        {existing && (
          <View style={styles.toggleWrap}>
            <Text style={[styles.toggleLabel, { color: c.textSecondary }]}>알림</Text>
            <Switch
              value={existing.enabled}
              onValueChange={() => toggleEnabled(ticker, market)}
              trackColor={{ false: c.backgroundTertiary, true: "#0064FF" }}
              thumbColor="#fff"
            />
          </View>
        )}
      </View>

      <View style={styles.tierList}>
        {renderTier("tier1", t1, t1n)}
        {renderTier("tier2", t2, t2n)}
        {renderTier("tier3", t3, t3n)}
      </View>

      {suggest && (
        <TouchableOpacity onPress={useSuggested} style={[styles.suggestBtn, { backgroundColor: c.backgroundTertiary }]}>
          <Ionicons name="sparkles-outline" size={13} color={c.tint} />
          <Text style={[styles.suggestText, { color: c.tint }]}>
            -4% / -7% / -12% 자동 채우기
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        {existing && (
          <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { borderColor: c.separator }]}>
            <Ionicons name="trash-outline" size={14} color={c.negative} />
            <Text style={[styles.clearText, { color: c.negative }]}>삭제</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!dirty}
          style={[styles.saveBtn, { backgroundColor: dirty ? "#0064FF" : c.backgroundTertiary, opacity: dirty ? 1 : 0.55 }]}
        >
          <Ionicons name="checkmark" size={15} color={dirty ? "#fff" : c.textSecondary} />
          <Text style={[styles.saveText, { color: dirty ? "#fff" : c.textSecondary }]}>
            {existing ? "변경사항 저장" : "타겟가 저장"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.foot, { color: c.textTertiary }]}>
        가격이 타겟선 이하로 진입하면 푸시 알림이 옵니다 · 6시간 쿨다운 · 가격 회복 시 재무장
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16 },
  header:  { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  title:   { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subtitle:{ fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  toggleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tierList: { },
  tierRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tierLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  tierDot:  { width: 8, height: 8, borderRadius: 4 },
  tierLabel:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tierHint: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  tierRight:{ flexDirection: "row", alignItems: "center", gap: 8 },
  inputWrap:{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 100, borderWidth: 1.5 },
  curSign:  { fontSize: 12, marginRight: 2, fontFamily: "Inter_500Medium" },
  input:    { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, padding: 0, minWidth: 60, textAlign: "right" },
  distance: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 48, textAlign: "right" },
  suggestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 8, marginTop: 10 },
  suggestText:{ fontSize: 12, fontFamily: "Inter_500Medium" },
  actions:  { flexDirection: "row", gap: 8, marginTop: 12 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  clearText:{ fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  saveText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  foot:     { fontSize: 10, marginTop: 10, lineHeight: 14, textAlign: "center" },
});
