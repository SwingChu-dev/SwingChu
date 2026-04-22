import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@earnings_scheduled_v1";

interface ScheduledEntry {
  earningsDateISO: string;
  timeOfDay: "BMO" | "AMC" | "DMH" | null;
  d7Id: string | null;
  d1Id: string | null;
}

type ScheduleMap = Record<string, ScheduledEntry>;  // key = `${ticker}:${market}`

async function loadMap(): Promise<ScheduleMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function saveMap(map: ScheduleMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function cancelIfExists(id: string | null): Promise<void> {
  if (!id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}

/** 한국 시간 기준 오전 9시에 알림을 예약 (Asia/Seoul ≈ UTC+9) */
function alertDateAtKstMorning(earningsDateISO: string, daysBefore: number): Date {
  const earnings = new Date(earningsDateISO);
  // earnings 날짜의 자정 UTC → daysBefore일 빼고 오전 9시 KST = 0시 UTC
  const targetUtc = new Date(Date.UTC(
    earnings.getUTCFullYear(), earnings.getUTCMonth(), earnings.getUTCDate() - daysBefore, 0, 0, 0,
  ));
  return targetUtc;
}

async function scheduleAt(
  date: Date, ticker: string, name: string, label: string, body: string,
): Promise<string | null> {
  if (date.getTime() <= Date.now() + 60_000) return null;  // 이미 지났거나 1분 이내
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 실적 ${label} — ${name}`,
        body,
        sound: true,
        data: { type: "earnings_dday", ticker, label },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === "android" ? "price-alerts" : undefined,
      } as Notifications.DateTriggerInput,
    });
    return id;
  } catch {
    return null;
  }
}

export interface EarningsLite {
  ticker: string;
  market: string;
  name:   string;
  earningsDateISO: string | null;
  timeOfDay: "BMO" | "AMC" | "DMH" | null;
}

/**
 * 실적 D-7 / D-1 푸시 알림을 예약한다 (KST 9am).
 * - 실적일이 바뀌었으면 기존 알림 취소 후 재예약
 * - 알림 권한 없으면 no-op
 */
export async function syncEarningsAlerts(items: EarningsLite[]): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
  } catch {
    return;
  }

  const map = await loadMap();
  const seenKeys = new Set<string>();
  let dirty = false;

  for (const item of items) {
    const key = `${item.ticker.toUpperCase()}:${item.market}`;
    seenKeys.add(key);

    if (!item.earningsDateISO) continue;

    const existing = map[key];
    const sameDate = existing?.earningsDateISO === item.earningsDateISO
                  && existing?.timeOfDay === item.timeOfDay;

    if (sameDate && (existing.d7Id || existing.d1Id)) continue;  // 이미 예약됨

    // 기존 알림 취소
    await cancelIfExists(existing?.d7Id ?? null);
    await cancelIfExists(existing?.d1Id ?? null);

    const d7 = alertDateAtKstMorning(item.earningsDateISO, 7);
    const d1 = alertDateAtKstMorning(item.earningsDateISO, 1);
    const todLabel = item.timeOfDay === "BMO" ? "장전 발표" : item.timeOfDay === "AMC" ? "장후 발표" : "발표 예정";

    const d7Id = await scheduleAt(d7, item.ticker, item.name, "D-7",
      `${item.ticker.toUpperCase()} 실적까지 7일 · ${todLabel} · 포지션 점검·익절 검토`);
    const d1Id = await scheduleAt(d1, item.ticker, item.name, "D-1",
      `${item.ticker.toUpperCase()} 실적 내일 · ${todLabel} · 추가 진입·로스컷 결정 시점`);

    map[key] = {
      earningsDateISO: item.earningsDateISO,
      timeOfDay: item.timeOfDay,
      d7Id, d1Id,
    };
    dirty = true;
  }

  // 더 이상 관심·보유에 없는 종목의 알림 정리
  for (const key of Object.keys(map)) {
    if (!seenKeys.has(key)) {
      await cancelIfExists(map[key].d7Id);
      await cancelIfExists(map[key].d1Id);
      delete map[key];
      dirty = true;
    }
  }

  if (dirty) await saveMap(map);
}
