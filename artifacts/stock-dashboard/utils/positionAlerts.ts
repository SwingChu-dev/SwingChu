import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function sendStopLossNotification(
  ticker: string, name: string, currentPrice: number, stopLoss: number,
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛑 손절선 도달 — ${name}`,
        body:  `${ticker.toUpperCase()} 현재가 ${currentPrice.toLocaleString()} (손절 ${stopLoss.toLocaleString()}). 즉시 대응 필요.`,
        sound: true,
        data:  { type: "stop_loss", ticker },
      },
      trigger: Platform.OS === "android"
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: "cooldown" } as Notifications.TimeIntervalTriggerInput
        : null,
    });
  } catch {}
}

export async function sendTakeProfitNotification(
  ticker: string, name: string, level: number, currentPrice: number, gainPct: number,
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 익절 ${level}% 도달 — ${name}`,
        body:  `${ticker.toUpperCase()} 현재가 ${currentPrice.toLocaleString()} · 수익 ${gainPct.toFixed(1)}%. 분할 익절 검토.`,
        sound: true,
        data:  { type: "take_profit", ticker, level },
      },
      trigger: Platform.OS === "android"
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: "cooldown" } as Notifications.TimeIntervalTriggerInput
        : null,
    });
  } catch {}
}
