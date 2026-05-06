import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Appearance, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "@swingchu/theme-pref";

interface ThemeCtx {
  pref:    ThemePref;
  setPref: (p: ThemePref) => void;
  ready:   boolean;
}

const Context = createContext<ThemeCtx | null>(null);

function applyOverride(pref: ThemePref) {
  // null = 시스템 값 따름 / "light"|"dark" = 강제 오버라이드.
  // iOS에선 너무 일찍 호출되면 일부 view에 전파 안 되는 경우가 있어 호출 측에서
  // 한 번 더(다음 tick) 호출해 안전 마진을 둠.
  Appearance.setColorScheme(pref === "system" ? null : pref);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref,  setPrefState] = useState<ThemePref>("system");
  const [ready, setReady]     = useState(false);
  const prefRef = useRef<ThemePref>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const v: ThemePref = raw === "light" || raw === "dark" ? raw : "system";
        prefRef.current = v;
        setPrefState(v);
        applyOverride(v);
        // 일부 view가 첫 호출을 놓치는 iOS 케이스 대응 — 다음 tick에 재호출.
        setTimeout(() => applyOverride(v), 50);
      })
      .catch((e) => { console.warn("[Theme] storage read failed", e); })
      .finally(() => setReady(true));
  }, []);

  // 앱이 다시 활성화될 때마다 override 재적용 — 백그라운드에서 시스템 테마가
  // 바뀐 경우 또는 RN의 Appearance 캐시가 stale해진 경우에 대비.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") applyOverride(prefRef.current);
    });
    return () => sub.remove();
  }, []);

  const setPref = (p: ThemePref) => {
    prefRef.current = p;
    setPrefState(p);
    applyOverride(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch((e) => {
      console.warn("[Theme] storage write failed", e);
    });
  };

  return (
    <Context.Provider value={{ pref, setPref, ready }}>
      {children}
    </Context.Provider>
  );
}

export function useThemePref() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useThemePref must be used inside ThemeProvider");
  return ctx;
}
