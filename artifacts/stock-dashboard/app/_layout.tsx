import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme, View, Text, StyleSheet, ActivityIndicator, Image } from "react-native";
import Colors from "@/constants/colors";
import { WatchlistProvider, useWatchlist } from "@/context/WatchlistContext";
import { StockPriceProvider, useStockPrice } from "@/context/StockPriceContext";
import { AlertProvider, useAlerts } from "@/context/AlertContext";
import { EnrichmentProvider } from "@/context/EnrichmentContext";
import { AISignalProvider } from "@/context/AISignalContext";
import { PortfolioProvider, usePortfolio } from "@/context/PortfolioContext";
import { TargetTiersProvider, useTargetTiers } from "@/context/TargetTiersContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AlertBanner from "@/components/AlertBanner";
import EarningsAlertScheduler from "@/components/EarningsAlertScheduler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupNotifications } from "@/utils/notifications";
import { registerBackgroundPriceTask } from "@/utils/backgroundPriceFetch";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function DisclaimerScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[disclaimerStyles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <StatusBar style="light" />
      <View style={disclaimerStyles.logoWrap}>
        <Image
          source={require("@/assets/images/caricature.png")}
          style={disclaimerStyles.caricature}
          resizeMode="contain"
        />
        <Text style={disclaimerStyles.logoTitle}>스윙의 정석</Text>
        <Text style={disclaimerStyles.logoSub}>스윙 트레이딩 전략 대시보드</Text>
      </View>

      <View style={disclaimerStyles.card}>
        <Text style={disclaimerStyles.cardTitle}>⚠️ 투자 유의사항</Text>
        <Text style={disclaimerStyles.cardBody}>
          본 앱에서 제공하는 모든 정보는{"\n"}
          <Text style={disclaimerStyles.bold}>참고용</Text>이며, 실제 투자 결정 및 그에 따른{"\n"}
          <Text style={disclaimerStyles.bold}>손익은 전적으로 본인에게 있습니다.</Text>
        </Text>
        <View style={disclaimerStyles.divider} />
        <Text style={disclaimerStyles.subNote}>
          • 주식 투자에는 원금 손실 위험이 있습니다{"\n"}
          • 과거 수익률이 미래를 보장하지 않습니다{"\n"}
          • 본인의 투자 성향과 목표를 고려하세요
        </Text>
      </View>

      <View style={disclaimerStyles.loadingRow}>
        <ActivityIndicator size="small" color="#0064FF" />
        <Text style={disclaimerStyles.loadingText}>데이터 불러오는 중...</Text>
      </View>
    </View>
  );
}

const disclaimerStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A1628",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  logoWrap:  { alignItems: "center", gap: 10, marginTop: 32 },
  caricature:{ width: 124, height: 124, borderRadius: 62 },
  logoTitle: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.5, marginTop: 4 },
  logoSub:   { fontSize: 13, color: "#64748B" },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#141B2D",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E2D4A",
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#F59E0B", textAlign: "center" },
  cardBody:  { fontSize: 15, color: "#CBD5E1", lineHeight: 24, textAlign: "center" },
  bold:      { color: "#FFFFFF", fontWeight: "700" },
  divider:   { height: 1, backgroundColor: "#1E2D4A" },
  subNote:   { fontSize: 12, color: "#64748B", lineHeight: 20 },
  loadingRow:{ flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText:{ fontSize: 13, color: "#64748B" },
});

function PriceBridge({ children }: { children: React.ReactNode }) {
  const { watchlistStocks } = useWatchlist();
  const { positions } = usePortfolio();
  const watchlist = React.useMemo(() => {
    const map = new Map<string, { ticker: string; market: string }>();
    for (const s of watchlistStocks) map.set(`${s.ticker}:${s.market}`, { ticker: s.ticker, market: s.market });
    for (const p of positions)      map.set(`${p.ticker.toUpperCase()}:${p.market}`, { ticker: p.ticker.toUpperCase(), market: p.market });
    return Array.from(map.values());
  }, [watchlistStocks, positions]);
  return <StockPriceProvider watchlist={watchlist}>{children}</StockPriceProvider>;
}

function AISignalBridge({ children }: { children: React.ReactNode }) {
  const { watchlistStocks } = useWatchlist();
  const watchlist = watchlistStocks.map(s => ({ ticker: s.ticker, market: s.market, id: s.id }));
  return <AISignalProvider watchlist={watchlist}>{children}</AISignalProvider>;
}

function AlertChecker() {
  const { quotes } = useStockPrice();
  const { checkPrices } = useAlerts();
  const { checkPositionAlerts } = usePortfolio();
  const { checkPricesForTiers } = useTargetTiers();
  React.useEffect(() => {
    const map: Record<string, { priceKRW: number }> = {};
    Object.entries(quotes).forEach(([key, q]) => {
      map[key] = { priceKRW: q.priceKRW };
    });
    if (Object.keys(map).length > 0) {
      checkPrices(map);
      checkPositionAlerts(map);
      checkPricesForTiers(map);
    }
  }, [quotes]);
  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AlertChecker />
      <EarningsAlertScheduler />
      <AlertBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="stock/[id]"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="add-stock"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.75, 1],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="market-cycle"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="backup"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="tax"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="import-screenshot"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="buy"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="cooldown/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="positions"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="weekly-report"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="stats"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="sell/[positionId]"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="add-holding"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />

      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [timerDone, setTimerDone] = useState(false);

  // 스플래시를 바로 숨기고 면책 화면을 5초 보여줌
  useEffect(() => {
    SplashScreen.hideAsync();
    const t = setTimeout(() => setTimerDone(true), 5000);
    setupNotifications().catch(() => {});
    registerBackgroundPriceTask().catch(() => {});
    return () => clearTimeout(t);
  }, []);

  if (!timerDone || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <DisclaimerScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <WatchlistProvider>
                  <PortfolioProvider>
                    <EnrichmentProvider>
                      <AISignalBridge>
                        <PriceBridge>
                          <AlertProvider>
                            <TargetTiersProvider>
                              <RootLayoutNav />
                            </TargetTiersProvider>
                          </AlertProvider>
                        </PriceBridge>
                      </AISignalBridge>
                    </EnrichmentProvider>
                  </PortfolioProvider>
                </WatchlistProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
