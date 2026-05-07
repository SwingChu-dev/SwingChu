import React, { useMemo } from "react";
import { View, StyleSheet, useColorScheme, Platform } from "react-native";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";

interface Props {
  ticker: string;
  market: "NASDAQ" | "KOSPI" | "KOSDAQ";
  /** 화면에 표시할 종목 한글명 (위젯 자체엔 사용 안 함, key용) */
  name?:    string;
  height?:  number;
}

/** TradingView symbol 표기로 변환 — KOSPI/KOSDAQ → KRX */
function tvSymbol(ticker: string, market: Props["market"]): string {
  const t = ticker.toUpperCase();
  if (market === "KOSPI" || market === "KOSDAQ") return `KRX:${t}`;
  return `NASDAQ:${t}`;
}

function buildHtml(symbol: string, isDark: boolean): string {
  // TradingView Advanced Real-Time Chart 위젯 — 공식 임베드 코드
  // https://www.tradingview.com/widget/advanced-chart/
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: ${isDark ? "#0E0E10" : "#FFFFFF"}; }
  .tradingview-widget-container { height: 100%; width: 100%; }
  .tradingview-widget-container > div { height: calc(100% - 32px); width: 100%; }
</style>
</head><body>
<div class="tradingview-widget-container">
  <div id="tv-widget"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
    new TradingView.widget({
      autosize: true,
      symbol: ${JSON.stringify(symbol)},
      interval: "D",
      timezone: "Asia/Seoul",
      theme: ${JSON.stringify(isDark ? "dark" : "light")},
      style: "1",
      locale: "kr",
      toolbar_bg: ${JSON.stringify(isDark ? "#0E0E10" : "#FFFFFF")},
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      container_id: "tv-widget"
    });
  </script>
</div>
</body></html>`;
}

export default function TradingViewChart({ ticker, market, height = 320 }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const symbol = tvSymbol(ticker, market);
  const html = useMemo(() => buildHtml(symbol, isDark), [symbol, isDark]);

  // 웹 환경(react-native-web)은 iframe 직접 렌더 — WebView가 부적합
  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height, backgroundColor: c.card }]}>
        {/* @ts-ignore — iframe은 RN 타입엔 없지만 web에서 동작 */}
        <iframe
          srcDoc={html}
          style={{ width: "100%", height: "100%", border: "0" }}
          title={`TradingView ${symbol}`}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height, backgroundColor: c.card }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        startInLoadingState
        style={{ backgroundColor: "transparent" }}
        // iOS: 인라인 미디어, 자동 스크롤 비활성
        allowsInlineMediaPlayback
        scalesPageToFit={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
});
