import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { PriceAlert } from "@/context/AlertContext";

export async function setupNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
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
    await Notifications.setNotificationChannelAsync("cooldown", {
      name: "쿨다운 종료",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#22C55E",
      sound: "default",
    });
  }
}

/** 쿨다운 종료 시점에 알림을 예약하고 notificationId 반환. 권한 없거나 시점이 지났으면 null. */
export async function scheduleCooldownEnd(
  entryId:  string,
  ticker:   string,
  name:     string,
  triggerAt: number,
): Promise<string | null> {
  const ms = triggerAt - Date.now();
  if (ms <= 1000) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ 쿨다운 종료 — ${name}`,
        body:  `${ticker.toUpperCase()} 진입 검토 시간입니다. 다시 한번 근거를 점검하세요.`,
        sound: true,
        data:  { type: "cooldown_end", entryId, ticker },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DATE,
        date:    new Date(triggerAt),
        channelId: Platform.OS === "android" ? "cooldown" : undefined,
      } as Notifications.DateTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(id: string | undefined): Promise<void> {
  if (!id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
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
