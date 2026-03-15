import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const KEYS = {
  creds:    "@kis_credentials_v1",
  cache:    "@kis_watchlist_cache_v1",
  lastSync: "@kis_last_sync_v1",
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KisStock {
  ticker: string;
  name:   string;
  market: "KOSPI" | "KOSDAQ";
}

export interface KisGroup {
  grpNo:   string;
  grpName: string;
  stocks:  KisStock[];
}

export interface KisCredentials {
  appkey:    string;
  appsecret: string;
}

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface KisContextValue {
  // 연결 상태
  credentials:  KisCredentials | null;
  isConnected:  boolean;

  // 관심종목 데이터
  groups:       KisGroup[];
  lastSync:     Date | null;
  totalCount:   number;

  // 동작 상태
  syncStatus:   SyncStatus;
  syncError:    string | null;
  verifying:    boolean;

  // 함수
  connect:      (creds: KisCredentials) => Promise<boolean>;
  disconnect:   () => void;
  syncWatchlist:() => Promise<KisGroup[]>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const KisContext = createContext<KisContextValue | null>(null);

export function useKis() {
  const ctx = useContext(KisContext);
  if (!ctx) throw new Error("useKis must be used inside KisProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function KisProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<KisCredentials | null>(null);
  const [groups,      setGroups]      = useState<KisGroup[]>([]);
  const [lastSync,    setLastSync]    = useState<Date | null>(null);
  const [syncStatus,  setSyncStatus]  = useState<SyncStatus>("idle");
  const [syncError,   setSyncError]   = useState<string | null>(null);
  const [verifying,   setVerifying]   = useState(false);

  // 앱 시작 시 저장된 credentials + 캐시 복원
  useEffect(() => {
    (async () => {
      try {
        const [rawCreds, rawCache, rawLastSync] = await Promise.all([
          AsyncStorage.getItem(KEYS.creds),
          AsyncStorage.getItem(KEYS.cache),
          AsyncStorage.getItem(KEYS.lastSync),
        ]);

        if (rawCreds) setCredentials(JSON.parse(rawCreds));

        if (rawCache && rawLastSync) {
          const syncTime = new Date(rawLastSync);
          const age = Date.now() - syncTime.getTime();
          if (age < CACHE_TTL_MS) {
            setGroups(JSON.parse(rawCache));
            setLastSync(syncTime);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ── 연결 (verify token) ──────────────────────────────────────────────────
  const connect = useCallback(async (creds: KisCredentials): Promise<boolean> => {
    setVerifying(true);
    setSyncError(null);
    try {
      const resp = await fetch(`${API_BASE}/kis/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(creds),
      });
      if (!resp.ok) {
        const d = await resp.json();
        setSyncError(d.error ?? "인증 실패");
        return false;
      }
      await AsyncStorage.setItem(KEYS.creds, JSON.stringify(creds));
      setCredentials(creds);
      return true;
    } catch (e: any) {
      setSyncError(e.message ?? "네트워크 오류");
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  // ── 연결 해제 ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setCredentials(null);
    setGroups([]);
    setLastSync(null);
    setSyncStatus("idle");
    setSyncError(null);
    Promise.all([
      AsyncStorage.removeItem(KEYS.creds),
      AsyncStorage.removeItem(KEYS.cache),
      AsyncStorage.removeItem(KEYS.lastSync),
    ]).catch(() => {});
  }, []);

  // ── 관심종목 동기화 ──────────────────────────────────────────────────────
  const syncWatchlist = useCallback(async (): Promise<KisGroup[]> => {
    if (!credentials) return [];
    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const resp = await fetch(`${API_BASE}/kis/watchlist`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(credentials),
      });

      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error ?? `서버 오류 ${resp.status}`);
      }

      const data = await resp.json() as { groups: KisGroup[]; totalCount: number };
      const now  = new Date();

      setGroups(data.groups);
      setLastSync(now);
      setSyncStatus("success");

      // 캐시 저장 (비동기, 실패해도 무방)
      Promise.all([
        AsyncStorage.setItem(KEYS.cache,    JSON.stringify(data.groups)),
        AsyncStorage.setItem(KEYS.lastSync, now.toISOString()),
      ]).catch(() => {});

      return data.groups;
    } catch (e: any) {
      setSyncStatus("error");
      setSyncError(e.message ?? "동기화 오류");
      return [];
    }
  }, [credentials]);

  const totalCount = groups.reduce((acc, g) => acc + g.stocks.length, 0);

  return (
    <KisContext.Provider value={{
      credentials,
      isConnected:  !!credentials,
      groups,
      lastSync,
      totalCount,
      syncStatus,
      syncError,
      verifying,
      connect,
      disconnect,
      syncWatchlist,
    }}>
      {children}
    </KisContext.Provider>
  );
}
