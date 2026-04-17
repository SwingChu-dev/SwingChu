import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { PriceAlert } from "@/context/AlertContext";

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("price-alerts", {
      name: "가격 알림",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0064FF",
      sound: "default",
    });
  }
}

export async function sendAlertNotification(
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  const typeLabel: Record<string, string> = {
    above:          "목표가 도달 ↑",
    below:          "매수 타점 진입 ↓",
    rsi_overbought: "RSI 과매수",
    rsi_oversold:   "RSI 과매도",
    profit_take:    "수익 목표 달성 🏆",
  };

  const priceStr =
    currentPrice >= 1000
      ? `₩${currentPrice.toLocaleString()}`
      : `$${currentPrice.toFixed(2)}`;

  const bodyMap: Record<string, string> = {
    above:
      `현재가 ${priceStr}${alert.targetPrice ? ` · 목표 ₩${alert.targetPrice.toLocaleString()}` : ""} · 익절 타이밍 확인`,
    below:
      `현재가 ${priceStr}${alert.targetPrice ? ` · 목표 ₩${alert.targetPrice.toLocaleString()}` : ""} · 분할 매수 실행`,
    rsi_overbought: `현재가 ${priceStr} · RSI 과매수 구간 진입`,
    rsi_oversold:   `현재가 ${priceStr} · RSI 과매도 — 매수 검토`,
    profit_take:    `현재가 ${priceStr} · 수익 ${alert.targetProfitPct}% 달성 · 익절 타이밍`,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${typeLabel[alert.type] ?? "알림"} — ${alert.name}`,
      body:  bodyMap[alert.type] ?? `현재가 ${priceStr}`,
      sound: true,
      data:  { alertId: alert.id, ticker: alert.ticker },
    },
    trigger: null,
  });
}
