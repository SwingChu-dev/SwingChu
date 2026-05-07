import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { STOCKS, StockInfo, USD_KRW_RATE } from "@/constants/stockData";
import { useStockPrice } from "@/context/StockPriceContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useEnrichment } from "@/context/EnrichmentContext";
import SplitEntrySection from "@/components/detail/SplitEntrySection";
import ProfitTargetSection from "@/components/detail/ProfitTargetSection";
import BoxRangeSection from "@/components/detail/BoxRangeSection";
import ForecastSection from "@/components/detail/ForecastSection";
import FinancialsSection from "@/components/detail/FinancialsSection";
import RiskSection from "@/components/detail/RiskSection";
import TechnicalSection, { TechnicalSummary } from "@/components/detail/TechnicalSection";
import DayFeaturesSection from "@/components/detail/DayFeaturesSection";
import NewsSection from "@/components/detail/NewsSection";
import BacktestSection from "@/components/detail/BacktestSection";
import AlertSettingsModal from "@/components/detail/AlertSettingsModal";
import StockChatSheet from "@/components/StockChatSheet";
import AnthropicSection from "@/components/detail/AnthropicSection";
import TargetTiersSection from "@/components/detail/TargetTiersSection";
import EarningsBadge from "@/components/detail/EarningsBadge";
import FomcBadge from "@/components/detail/FomcBadge";
import TradingViewChart from "@/components/detail/TradingViewChart";
import PatternCard from "@/components/detail/PatternCard";
import AnalystSection from "@/components/detail/AnalystSection";
import ShortSellSection from "@/components/detail/ShortSellSection";
import OverheatSection from "@/components/detail/OverheatSection";
import { calcBoxPosition } from "@/utils/boxPosition";
import { buildEnrichedStock, StockDetail } from "@/utils/enrichStub";
import { getMarketStatus, type MarketKey } from "@/utils/marketHolidays";

type TabKey = "진입" | "익절" | "박스권" | "재무·전망" | "기술·진단" | "리스크" | "요일" | "뉴스" | "백테스트" | "AI/앤트로픽";

const TABS: TabKey[] = ["진입", "익절", "박스권", "재무·전망", "기술·진단", "리스크", "요일", "뉴스", "백테스트", "AI/앤트로픽"];

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  KOSPI: "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

import { API_BASE } from "@/utils/apiBase";

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("진입");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { allKnownStocks } = useWatchlist();
  const { priceKRW: liveKRW, changePct: liveChangePct, getQuote } = useStockPrice();
  const { getEnriched, isEnriching, hasFailed, reEnrichStock, buildStockInfo } = useEnrichment();

  const baseStock = allKnownStocks.find((s) => s.id === id) ?? STOCKS.find((s) => s.id === id);

  const isPredefined = !!STOCKS.find((s) => s.id === id);
  const isStub = !isPredefined && !!baseStock;

  const enrichedData        = id ? getEnriched(id) : null;
  const isCurrentlyEnriching = id ? isEnriching(id) : false;
  const enrichmentFailed    = id ? hasFailed(id) : false;

  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const [tradingStatus, setTradingStatus] = useState<{
    score: number; title: string; color: string; icon: string;
  } | null>(null);

  useEffect(() => {
    if (!baseStock) return;
    fetch(`${API_BASE}/stocks/overheating?ticker=${encodeURIComponent(baseStock.ticker)}&market=${encodeURIComponent(baseStock.market)}`)
      .then(r => r.json())
      .then(d => {
        const score = d.overheatScore as number;
        if (score == null || isNaN(score)) return;
        let title = "저평가 — 매수 진입 우호 구간";
        let color = "#0064FF";
        let icon  = "rocket-outline";
        if      (score >= 80) { title = "극과열 — 신규 진입 자제";       color = "#F04452"; icon = "flame-outline";    }
        else if (score >= 60) { title = "과열 — 추격 매수 주의";          color = "#FF6B00"; icon = "warning-outline";  }
        else if (score >= 40) { title = "주의 — 모멘텀 확인 후 진입";    color = "#F59E0B"; icon = "analytics-outline"; }
        else if (score >= 20) { title = "적정 — 건강한 매수 구간";        color = "#2DB55D"; icon = "trending-up-outline"; }
        setTradingStatus({ score, title, color, icon });
      })
      .catch(() => {});
  }, [baseStock?.ticker, baseStock?.market]);

  // stub 종목: 자동으로 detail + enrichment 실행
  useEffect(() => {
    if (!isStub || !baseStock) return;
    if (enrichedData) return;
    if (isCurrentlyEnriching) return;
    setDetailLoading(true);
    setDetailError(false);
    globalThis
      .fetch(`${API_BASE}/stocks/detail?ticker=${encodeURIComponent(baseStock.ticker)}&market=${baseStock.market}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d: StockDetail) => {
        setDetail(d);
        setDetailLoading(false);
      })
      .catch(() => {
        setDetailError(true);
        setDetailLoading(false);
      });
  }, [isStub, baseStock?.id, !!enrichedData, isCurrentlyEnriching]);

  if (!baseStock) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: c.background }]}>
        <Text style={[styles.errorText, { color: c.text }]}>종목을 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: c.tint }]}>← 뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const liveQuote = getQuote(baseStock.ticker, baseStock.market);

  // enrichedData가 있으면 predefined/stub 모두 AI 분석 결과 우선 적용
  const stock: StockInfo = useMemo(() =>
    enrichedData
      ? buildStockInfo(baseStock, enrichedData)
      : isStub
        ? detail
          ? buildEnrichedStock(baseStock, detail, liveQuote)
          : baseStock
        : baseStock
  , [enrichedData, isStub, detail, liveQuote, baseStock]);

  const marketColor   = MARKET_COLORS[stock.market] || "#888";
  const firstForecast = stock.forecasts[0];
  const displayPrice  = liveKRW(stock.ticker, stock.market, stock.currentPrice);
  const rawChangePct  = liveChangePct(stock.ticker, stock.market);
  const isLive        = rawChangePct !== null;
  const displayChangePct = isLive ? rawChangePct : firstForecast?.changePercent ?? 0;
  const isPositiveShort  = displayChangePct >= 0;

  const dynBoxPos = useMemo(
    () => calcBoxPosition(stock.boxRange, liveQuote),
    [stock.boxRange, liveQuote]
  );

  const technicalSummary: TechnicalSummary | null = useMemo(
    () => (enrichedData as any)?.technicalSummary ?? null,
    [enrichedData]
  );
  const boxPosColor =
    dynBoxPos === "저점권" ? c.positive :
    dynBoxPos === "고점권" ? c.negative : c.warning;

  // AI 배너 표시 여부 (predefined + stub 공통)
  const showAiBanner = isCurrentlyEnriching || !!enrichedData || enrichmentFailed;
  // predefined 종목이고 아직 AI 분석 없을 때 "AI 분석하기" 버튼 표시
  const showAiPrompt = isPredefined && !enrichedData && !isCurrentlyEnriching && !enrichmentFailed;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: c.backgroundTertiary }]}
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/buy", params: { stockId: id } })}
          style={[styles.buyBtn, { backgroundColor: "#22C55E" }]}
        >
          <Ionicons name="cart" size={16} color="#fff" />
          <Text style={styles.buyBtnText}>매수 검토</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerName, { color: c.text }]}>{stock.name}</Text>
            <View style={[styles.marketBadge, { backgroundColor: marketColor + "22" }]}>
              <Text style={[styles.marketText, { color: marketColor }]}>{stock.market}</Text>
            </View>
            {(() => {
              const status = getMarketStatus(stock.market as MarketKey);
              if (!status.closed) return null;
              return (
                <View style={styles.holidayBadge}>
                  <Text style={styles.holidayBadgeText}>휴장 · {status.reason}</Text>
                </View>
              );
            })()}
          </View>
          <View style={styles.headerPriceRow}>
            {stock.market === "NASDAQ" ? (
              <>
                <Text style={[styles.headerPrice, { color: c.text }]}>
                  ${(displayPrice / USD_KRW_RATE).toFixed(2)}
                </Text>
                <View style={[styles.usdBadge, { backgroundColor: c.backgroundTertiary }]}>
                  <Text style={[styles.usdBadgeText, { color: c.textSecondary }]}>
                    ₩{displayPrice.toLocaleString()}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.headerPrice, { color: c.text }]}>
                ₩{displayPrice.toLocaleString()}
              </Text>
            )}
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDotDetail} />
                <Text style={styles.liveText}>실시간</Text>
              </View>
            )}
            <View style={[styles.regionBadge, { backgroundColor: c.backgroundTertiary }]}>
              <Text style={[styles.regionText, { color: c.textSecondary }]}>
                {stock.region} · {stock.grade}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowAlertModal(true)}
          style={[styles.alertBtn, { backgroundColor: c.backgroundTertiary }]}
        >
          <Ionicons name="notifications-outline" size={20} color={c.text} />
        </TouchableOpacity>
      </View>

      {/* AI 요약하기 버튼 — predefined 종목이고 아직 분석 안 된 경우 */}
      {showAiPrompt && (
        <TouchableOpacity
          style={[styles.aiPromptBanner, { backgroundColor: "#0064FF0D" }]}
          onPress={() => reEnrichStock(id!, baseStock.ticker, baseStock.market)}
          activeOpacity={0.75}
        >
          <Ionicons name="sparkles-outline" size={14} color="#0064FF" />
          <Text style={[styles.aiBannerText, { color: "#0064FF" }]}>
            AI가 실시간 데이터로 전략을 재계산할 수 있어요
          </Text>
          <View style={styles.aiReanalyzeBtn}>
            <Text style={styles.aiReanalyzeText}>AI 요약</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* AI 상태 배너 — 분석 중 / 완료 / 실패 */}
      {showAiBanner && (
        <View style={[styles.aiBanner, {
          backgroundColor: isCurrentlyEnriching ? "#F59E0B18"
            : enrichmentFailed ? "#F0445218"
            : "#0064FF18",
        }]}>
          {isCurrentlyEnriching ? (
            <>
              <ActivityIndicator size="small" color="#F59E0B" style={{ transform: [{ scale: 0.8 }] }} />
              <Text style={[styles.aiBannerText, { color: "#F59E0B" }]}>
                AI 요약 중 — 1년 실데이터 기반 전략 계산 중...
              </Text>
            </>
          ) : enrichmentFailed ? (
            <>
              <Ionicons name="warning-outline" size={14} color="#F04452" />
              <Text style={[styles.aiBannerText, { color: "#F04452" }]}>AI 요약 실패</Text>
              <TouchableOpacity
                onPress={() => reEnrichStock(id!, baseStock.ticker, baseStock.market)}
                style={styles.aiRetryBtn}
              >
                <Text style={styles.aiRetryText}>재시도</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color="#0064FF" />
              <Text style={[styles.aiBannerText, { color: "#0064FF" }]}>
                AI 요약 완료 — 1년 실데이터 기반 · 분할매수·익절·재무 자동 계산
              </Text>
              <TouchableOpacity
                onPress={() => reEnrichStock(id!, baseStock.ticker, baseStock.market)}
                style={styles.aiReanalyzeBtn}
              >
                <Text style={styles.aiReanalyzeText}>재분석</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 매매 상태 배너 — overheat score 기반 */}
      {tradingStatus && (
        <View style={[styles.tradingStatusBanner, {
          backgroundColor: tradingStatus.color + "12",
          borderBottomColor: tradingStatus.color + "28",
        }]}>
          <Ionicons name={tradingStatus.icon as any} size={14} color={tradingStatus.color} />
          <Text style={[styles.tradingStatusText, { color: tradingStatus.color }]}>
            매매 상태 · {tradingStatus.title}
          </Text>
          <View style={[styles.tradingStatusBadge, { backgroundColor: tradingStatus.color + "22" }]}>
            <Text style={[styles.tradingStatusScore, { color: tradingStatus.color }]}>
              {tradingStatus.score}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.statsBar, { backgroundColor: c.card, borderBottomColor: c.separator }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>박스권</Text>
          <Text style={[styles.statValue, { color: boxPosColor }]}>{dynBoxPos}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>재무 평가</Text>
          <Text style={[styles.statValue, {
            color: stock.financials.evaluation.includes("저평가") ? c.positive
                 : stock.financials.evaluation.includes("거품")   ? c.negative
                 : c.warning,
          }]}>
            {isStub && detailLoading ? "로딩중" : stock.financials.evaluation}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>
            {isLive ? "당일 등락" : "내일 전망"}
          </Text>
          <Text style={[styles.statValue, { color: isPositiveShort ? c.positive : c.negative }]}>
            {isPositiveShort ? "+" : ""}{displayChangePct.toFixed(2)}%
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>1차 진입</Text>
          <Text style={[styles.statValue, { color: c.tint }]}>
            -5%
          </Text>
        </View>
      </View>

      {/* TradingView 차트 — 탭 바 직전에 항상 노출 */}
      <TradingViewChart
        ticker={stock.ticker}
        market={stock.market as "NASDAQ" | "KOSPI" | "KOSDAQ"}
        name={stock.name}
      />

      {/* 차트 패턴 카드 — 규칙 기반 + AI 자세히 */}
      <PatternCard
        ticker={stock.ticker}
        market={stock.market}
        name={stock.name}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: c.card }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: c.tint }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? c.tint : c.textSecondary },
              activeTab === tab && { fontFamily: "Inter_600SemiBold" },
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* stub 종목: AI 분석 중 전체 로딩 화면 */}
      {isStub && isCurrentlyEnriching && !enrichedData && activeTab !== "뉴스" && activeTab !== "백테스트" && activeTab !== "AI/앤트로픽" ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={[styles.loadingText, { color: "#F59E0B" }]}>
            AI가 1년 실데이터를 분석하고 있습니다...
          </Text>
          <Text style={[styles.loadingText, { color: c.textSecondary, fontSize: 12, textAlign: "center" }]}>
            분할매수 레벨 · 익절 목표 · 재무 분석 · 리스크 계산 중
          </Text>
        </View>
      ) : isStub && detailLoading && !enrichedData && activeTab !== "뉴스" && activeTab !== "백테스트" && activeTab !== "AI/앤트로픽" ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={c.tint} />
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>
            실시간 재무 데이터 로딩 중...
          </Text>
        </View>
      ) : (
        /* predefined 종목: AI 분석 중에도 기존 데이터 표시 (로딩 화면 없음) */
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {activeTab !== "뉴스" && activeTab !== "백테스트" && activeTab !== "AI/앤트로픽" && (
            <>
              <View style={styles.descriptionBox}>
                <Text style={[styles.description, { color: c.textSecondary }]}>
                  {stock.description}
                </Text>
              </View>
              {isStub && detailError && (
                <View style={[styles.errorBanner, { backgroundColor: "#FF645222" }]}>
                  <Ionicons name="warning-outline" size={16} color="#FF6452" />
                  <Text style={[styles.errorBannerText, { color: "#FF6452" }]}>
                    일부 재무 데이터를 불러오지 못했습니다. 기본값으로 표시합니다.
                  </Text>
                </View>
              )}
              <View style={styles.themesRow}>
                {stock.themes.map((t) => (
                  <View key={t} style={[styles.themeTag, { backgroundColor: c.backgroundTertiary }]}>
                    <Text style={[styles.themeText, { color: c.textSecondary }]}>{t}</Text>
                  </View>
                ))}
              </View>
              <EarningsBadge ticker={stock.ticker} market={stock.market} />
              <FomcBadge market={stock.market} />
            </>
          )}

          {/* predefined 종목: AI 요약 중 탭 위에 오버레이 배너 */}
          {isPredefined && isCurrentlyEnriching && activeTab !== "뉴스" && activeTab !== "백테스트" && activeTab !== "AI/앤트로픽" && activeTab !== "기술·진단" && activeTab !== "리스크" && (
            <View style={[styles.aiOverlayBanner, { backgroundColor: "#F59E0B14" }]}>
              <ActivityIndicator size="small" color="#F59E0B" style={{ transform: [{ scale: 0.75 }] }} />
              <Text style={[styles.aiOverlayText, { color: "#F59E0B" }]}>
                AI 요약 중 — 완료 후 전략이 자동 업데이트됩니다
              </Text>
            </View>
          )}

          {activeTab === "진입"   && (
            <>
              <TargetTiersSection
                ticker={stock.ticker}
                market={stock.market}
                name={stock.name}
                currentPriceKRW={displayPrice}
              />
              <AnalystSection
                ticker={stock.ticker}
                market={stock.market}
                currentPriceKRW={displayPrice}
              />
              <SplitEntrySection stock={stock} livePrice={displayPrice} overheatScore={tradingStatus?.score} />
            </>
          )}
          {activeTab === "익절"   && <ProfitTargetSection stock={stock} livePrice={displayPrice} />}
          {activeTab === "박스권" && <BoxRangeSection     stock={stock} livePrice={displayPrice} />}

          {activeTab === "재무·전망" && (
            <>
              <FinancialsSection stock={stock} />
              <ForecastSection   stock={stock} />
            </>
          )}

          {activeTab === "기술·진단" && (
            <>
              <TechnicalSection
                ticker={stock.ticker}
                market={stock.market}
                enrichedSummary={technicalSummary}
              />
              <OverheatSection ticker={stock.ticker} market={stock.market} />
            </>
          )}

          {activeTab === "리스크" && (
            <>
              <ShortSellSection ticker={stock.ticker} market={stock.market} />
              <RiskSection      stock={stock} />
            </>
          )}

          {activeTab === "요일"     && <DayFeaturesSection stock={stock} />}
          {activeTab === "뉴스"     && <NewsSection ticker={stock.ticker} market={stock.market} name={stock.name} />}
          {activeTab === "백테스트" && <BacktestSection stock={stock} />}
          {activeTab === "AI/앤트로픽"   && <AnthropicSection stockId={stock.id} />}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <AlertSettingsModal
        visible={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        ticker={stock.ticker}
        market={stock.market}
        name={stock.name}
        currentPrice={displayPrice}
      />

      <TouchableOpacity
        style={[styles.chatFab, { backgroundColor: c.aiAccent, shadowColor: c.aiAccent }]}
        onPress={() => setShowChat(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
      </TouchableOpacity>

      <StockChatSheet
        visible={showChat}
        onClose={() => setShowChat(false)}
        context={{
          ticker: stock.ticker,
          market: stock.market,
          name:   stock.name,
          currentPrice: displayPrice,
          changePct:    typeof rawChangePct === "number" ? rawChangePct : undefined,
          rsi14:  technicalSummary?.rsi14 ?? undefined,
          ma20:   technicalSummary?.ma20  ?? undefined,
          ma60:   technicalSummary?.ma60  ?? undefined,
          high52w: liveQuote?.high52w,
          low52w:  liveQuote?.low52w,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  errorContainer:{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText:     { fontSize: 16, fontFamily: "Inter_400Regular" },
  backLink:      { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center",
  },
  alertBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center",
  },
  buyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 19,
  },
  buyBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  headerInfo:    { flex: 1 },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerName:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  marketBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  marketText:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  holidayBadge:  {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  holidayBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  headerPriceRow:{ flexDirection: "row", alignItems: "center", gap: 8 },
  headerPrice:   { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  regionBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  regionText:    { fontSize: 11, fontFamily: "Inter_400Regular" },
  usdBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  usdBadgeText:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    backgroundColor: "#22C55E18",
  },
  liveDotDetail: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  liveText:      { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#22C55E" },
  statsBar: {
    flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statLabel:   { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 3 },
  statValue:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statDivider: { width: 1, marginVertical: 4 },
  tabBar:        { maxHeight: 44, borderBottomWidth: 0 },
  tabBarContent: { paddingHorizontal: 8 },
  tab:     { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  aiPromptBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#0064FF18",
  },
  aiBanner: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2035",
  },
  aiBannerText:    { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  aiRetryBtn:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: "#F0445222" },
  aiRetryText:     { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F04452" },
  aiReanalyzeBtn:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: "#0064FF22" },
  aiReanalyzeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#0064FF" },
  aiOverlayBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
    padding: 10, borderRadius: 10,
  },
  aiOverlayText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  tradingStatusBanner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tradingStatusText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tradingStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tradingStatusScore: { fontSize: 12, fontFamily: "Inter_700Bold" },
  descriptionBox:{ paddingHorizontal: 16, paddingVertical: 12 },
  description:   { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10,
  },
  errorBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  themesRow: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 6, marginBottom: 12,
  },
  themeTag:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  themeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bottomPad: { height: 100 },
  techUnavailWrap: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 48, paddingHorizontal: 32, gap: 12,
  },
  techUnavailTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  techUnavailText:  { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  techAnalyzeBtn:   {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  chatFab: {
    position: "absolute",
    right: 18,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  techAnalyzeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
