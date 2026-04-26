import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "@swingchu/theme-pref";

interface ThemeCtx {
  pref:    ThemePref;
  setPref: (p: ThemePref) => void;
  ready:   boolean;          // AsyncStorage 로드 완료 여부
}

const Context = createContext<ThemeCtx | null>(null);

function applyOverride(pref: ThemePref) {
  // null = 시스템 값 따름 / "light"|"dark" = 강제 오버라이드
  // 이걸 호출하면 useColorScheme()이 전역적으로 새 값을 반환함
  Appearance.setColorScheme(pref === "system" ? null : pref);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref,  setPrefState] = useState<ThemePref>("system");
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const v = raw === "light" || raw === "dark" ? raw : "system";
        setPrefState(v);
        applyOverride(v);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    applyOverride(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
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
