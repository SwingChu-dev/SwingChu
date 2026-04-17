import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { API_BASE } from "@/utils/apiBase";
import type { PriceAlert } from "@/context/AlertContext";

export const BACKGROUND_PRICE_TASK = "bg-price-check-v1";
const ALERTS_KEY = "@price_alerts_v1";

TaskManager.defineTask(BACKGROUND_PRICE_TASK, async () => {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const alerts: PriceAlert[] = JSON.parse(raw);
    const active = alerts.filter((a) => !a.triggered);
    if (active.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    const pairs = [...new Set(active.map((a) => `${a.ticker}:${a.market}`))];
    const priceMap: Record<string, number> = {};

    await Promise.allSettled(
      pairs.map(async (key) => {
        const [ticker, market] = key.split(":");
        try {
          const res = await fetch(
            `${API_BASE}/stocks/quotes?tickers=${encodeURIComponent(ticker)}&markets=${encodeURIComponent(market)}`
          );
          const data = await res.json();
          const item = Array.isArray(data) ? data[0] : null;
          if (item?.priceKRW) priceMap[key] = item.priceKRW;
        } catch {}
      })
    );

    let anyTriggered = false;
    const typeLabel: Record<string, string> = {
      above:          "목표가 도달 ↑",
      below:          "매수 타점 진입 ↓",
      rsi_overbought: "RSI 과매수",
      rsi_oversold:   "RSI 과매도",
      profit_take:    "수익 목표 달성 🏆",
    };

    const updated = alerts.map((alert) => {
      if (alert.triggered) return alert;
      const key = `${alert.ticker}:${alert.market}`;
      const price = priceMap[key];
      if (!price) return alert;

      let fire = false;
      if (alert.type === "above" && alert.targetPrice && price >= alert.targetPrice) fire = true;
      else if (alert.type === "below" && alert.targetPrice && price <= alert.targetPrice) fire = true;
      else if (alert.type === "profit_take" && alert.buyPrice && alert.targetProfitPct) {
        const pct = ((price - alert.buyPrice) / alert.buyPrice) * 100;
        if (pct >= alert.targetProfitPct) fire = true;
      }

      if (fire) {
        anyTriggered = true;
        const priceStr = price >= 1000 ? `₩${price.toLocaleString()}` : `$${price.toFixed(2)}`;
        Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${typeLabel[alert.type] ?? "알림"} — ${alert.name}`,
            body:
              alert.type === "profit_take"
                ? `현재가 ${priceStr} · 수익 ${alert.targetProfitPct}% 달성`
                : `현재가 ${priceStr}${alert.targetPrice ? ` · 목표 ₩${alert.targetPrice.toLocaleString()}` : ""}`,
            sound: true,
            data: { alertId: alert.id, ticker: alert.ticker },
          },
          trigger: null,
        }).catch(() => {});
        return { ...alert, triggered: true, triggeredAt: new Date().toISOString() };
      }
      return alert;
    });

    if (anyTriggered) {
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    }

    return anyTriggered
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundPriceTask(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PRICE_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_PRICE_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {}
}
