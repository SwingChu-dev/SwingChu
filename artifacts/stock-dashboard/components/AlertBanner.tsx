import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlerts } from "@/context/AlertContext";

export default function AlertBanner() {
  const { triggeredAlert, dismissTriggered } = useAlerts();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!triggeredAlert) {
      Animated.timing(slideAnim, { toValue: -120, duration: 300, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(slideAnim, { toValue: insets.top + 8, friction: 8, useNativeDriver: true }).start();
    const t = setTimeout(dismissTriggered, 6000);
    return () => clearTimeout(t);
  }, [triggeredAlert]);

  if (!triggeredAlert) return null;

  const { alert, currentPrice } = triggeredAlert;
  const isUp = alert.type === "above" || alert.type === "rsi_overbought";

  const typeLabel = {
    above: "목표가 도달",
    below: "하한가 도달",
    rsi_overbought: "RSI 과매수",
    rsi_oversold: "RSI 과매도",
  }[alert.type];

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }], top: 0 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isUp ? "#F04452" : "#1B63E8" }]}>
        <Ionicons name={isUp ? "arrow-up" : "arrow-down"} size={16} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>
          🔔 {typeLabel} — {alert.name}
        </Text>
        <Text style={styles.sub}>
          현재가 ₩{currentPrice.toLocaleString()}
          {alert.targetPrice ? `  |  목표 ₩${alert.targetPrice.toLocaleString()}` : ""}
        </Text>
      </View>
      <TouchableOpacity onPress={dismissTriggered} style={styles.close}>
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: "#1C1C2E",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body:  { flex: 1 },
  title: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  sub:   { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  close: { padding: 4 },
});
