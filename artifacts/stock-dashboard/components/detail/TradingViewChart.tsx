import React, { useMemo, useState } from "react";
import { View, StyleSheet, useColorScheme, Platform, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";

interface Props {
  ticker: string;
  market: "NASDAQ" | "KOSPI" | "KOSDAQ";
  /** 화면에 표시할 종목 한글명 (위젯 자체엔 사용 안 함) */
  name?:    string;
  /** 기본 높이 (접힘 상태) */
  height?:  number;
  /** 확대 시 높이 */
  expandedHeight?: number;
}

const STUDIES = [
  // 5/20/60일 단순이동평균 — TradingView v1.x 위젯 형식
  { id: "MASimple@tv-basicstudies", inputs: { length: 5  } },
  { id: "MASimple@tv-basicstudies", inputs: { length: 20 } },
  { id: "MASimple@tv-basicstudies", inputs: { length: 60 } },
  // RSI(14)
  { id: "RSI@tv-basicstudies",      inputs: { length: 14 } },
  // 볼린저 밴드 (default 20, 2)
  { id: "BB@tv-basicstudies" },
  // 거래량 — 명시적으로 추가해 가시성 보장
  { id: "Volume@tv-basicstudies" },
];

/** TradingView symbol 표기로 변환 — KOSPI/KOSDAQ → KRX */
function tvSymbol(ticker: string, market: Props["market"]): string {
  const t = ticker.toUpperCase();
  if (market === "KOSPI" || market === "KOSDAQ") return `KRX:${t}`;
  return `NASDAQ:${t}`;
}

function buildHtml(symbol: string, isDark: boolean): string {
  // TradingView Advanced Real-Time Chart — studies 옵션으로 기본 지표 자동 추가
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: ${isDark ? "#0E0E10" : "#FFFFFF"}; }
  .tradingview-widget-container { height: 100%; width: 100%; }
  .tradingview-widget-container > div { height: 100%; width: 100%; }
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
      studies: ${JSON.stringify(STUDIES)},
      container_id: "tv-widget"
    });
  </script>
</div>
</body></html>`;
}

export default function TradingViewChart({
  ticker,
  market,
  height = 240,
  expandedHeight = 480,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(false);
  const symbol = tvSymbol(ticker, market);
  const html = useMemo(() => buildHtml(symbol, isDark), [symbol, isDark]);
  const currentHeight = expanded ? expandedHeight : height;

  const ChartBody = () => {
    if (Platform.OS === "web") {
      return (
        // @ts-ignore — iframe은 RN 타입에 없지만 web에서 동작
        <iframe
          srcDoc={html}
          style={{ width: "100%", height: "100%", border: "0" }}
          title={`TradingView ${symbol}`}
        />
      );
    }
    return (
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        startInLoadingState
        style={{ backgroundColor: "transparent" }}
        allowsInlineMediaPlayback
        scalesPageToFit={false}
      />
    );
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.wrap, { height: currentHeight, backgroundColor: c.card }]}>
        <ChartBody />
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? "contract-outline" : "expand-outline"}
          size={14}
          color={c.textSecondary}
        />
        <Text style={[styles.toggleText, { color: c.textSecondary }]}>
          {expanded ? "차트 접기" : "차트 확대"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  toggleText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
