import AsyncStorage from "@react-native-async-storage/async-storage";

export const BACKUP_VERSION = 1;

const USER_DATA_KEYS = [
  "@watchlist_ids_v5",
  "@portfolio_positions_v1",
  "@portfolio_pending_v1",
  "@portfolio_cooldown_saves_v1",
  "@portfolio_settings_v1",
  "@portfolio_month_start_v1",
  "@portfolio_closed_trades_v1",
  "@price_alerts_v1",
  "@target_tiers_v1",
  "@swingchu/theme-pref",
] as const;

export interface BackupBundle {
  version: number;
  exportedAt: string;
  appVersion?: string;
  data: Record<string, string | null>;
}

export async function buildBackup(appVersion?: string): Promise<BackupBundle> {
  const entries = await AsyncStorage.multiGet([...USER_DATA_KEYS]);
  const data: Record<string, string | null> = {};
  for (const [k, v] of entries) data[k] = v;
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data,
  };
}

export function serializeBackup(bundle: BackupBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function parseBackup(raw: string): BackupBundle {
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed == null) {
    throw new Error("백업 형식이 올바르지 않습니다.");
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(`지원하지 않는 백업 버전: ${parsed.version}`);
  }
  if (typeof parsed.data !== "object" || parsed.data == null) {
    throw new Error("백업 데이터가 비어 있습니다.");
  }
  return parsed as BackupBundle;
}

export async function restoreBackup(bundle: BackupBundle): Promise<void> {
  const writes: [string, string][] = [];
  for (const key of USER_DATA_KEYS) {
    const value = bundle.data[key];
    if (typeof value === "string") writes.push([key, value]);
  }
  await AsyncStorage.multiSet(writes);
}
