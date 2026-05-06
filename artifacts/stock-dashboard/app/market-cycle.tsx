import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, G,
} from "react-native-svg";

import { useMarketIntel, CyclePhase, FgLevel, Severity, Market } from "@/hooks/useMarketIntel";
import { playbookFor } from "@/utils/regimePlaybook";

// ── 디자인 토큰 (HTML 시안의 색상) ─────────────────────────────────────────
const T = {
  bg:        "#0c0a08",
  bgCard:    "#17130e",
  bgInset:   "#1e1812",
  line:      "rgba(200,160,90,0.12)",
  lineStr:   "rgba(200,160,90,0.28)",
  ink:       "#ece0c6",
  inkDim:    "#a89a7c",
  inkMuted:  "#6b6151",
  gold:      "#d4a855",
  amber:     "#e8a642",
  warning:   "#d67b3a",
  danger:    "#c04f3c",
  fear:      "#4a7ea3",
  neutral:   "#8a7d68",
  greed:     "#c9914a",
  extreme:   "#c76a3a",
};

const FG_COLOR: Record<FgLevel, string> = {
  EXTREME_FEAR:  T.fear,
  FEAR:          "#6b8d9c",
  NEUTRAL:       T.neutral,
  GREED:         T.greed,
  EXTREME_GREED: T.extreme,
};
const FG_LABEL: Record<FgLevel, string> = {
  EXTREME_FEAR:  "극공포",
  FEAR:          "공포",
  NEUTRAL:       "중립",
  GREED:         "탐욕",
  EXTREME_GREED: "극탐욕",
};

const SEV_COLOR: Record<Severity, string> = {
  HIGH:   T.danger,
  MEDIUM: T.warning,
  LOW:    T.neutral,
};

// ── 사이클 단계별 곡선상 좌표 (HTML 디자인 기준) ─────────────────────────
const PHASE_POS: Record<CyclePhase, { x: number; y: number; lblY: number; enY: number }> = {
  DISBELIEF:    { x: 45,  y: 240, lblY: 265, enY: 278 },
  HOPE:         { x: 95,  y: 232, lblY: 220, enY: 210 },
  OPTIMISM:     { x: 145, y: 210, lblY: 198, enY: 188 },
  BELIEF:       { x: 195, y: 175, lblY: 163, enY: 153 },
  THRILL:       { x: 245, y: 125, lblY: 108, enY: 96  },
  EUPHORIA:     { x: 290, y: 60,  lblY: 48,  enY: 38  },
  COMPLACENCY:  { x: 335, y: 115, lblY: 100, enY: 90  },
  ANXIETY:      { x: 365, y: 170, lblY: 158, enY: 148 },
  DENIAL:       { x: 395, y: 210, lblY: 198, enY: 188 },
  PANIC:        { x: 430, y: 240, lblY: 228, enY: 218 },
  CAPITULATION: { x: 465, y: 254, lblY: 275, enY: 288 },
};
const PHASE_EN: Record<CyclePhase, string> = {
  DISBELIEF: "Disbelief", HOPE: "Hope", OPTIMISM: "Optimism", BELIEF: "Belief",
  THRILL: "Thrill", EUPHORIA: "Euphoria", COMPLACENCY: "Complacency",
  ANXIETY: "Anxiety", DENIAL: "Denial", PANIC: "Panic", CAPITULATION: "Capitulation",
};

// ─────────────────────────────────────────────────────────────────────────
function CycleSvg({ current, monthAgo }: { current: CyclePhase; monthAgo: CyclePhase }) {
  return (
    <Svg viewBox="0 0 500 320" width="100%" height={220}>
      <Defs>
        <LinearGradient id="cycleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#4a7ea3" stopOpacity={0.6}/>
          <Stop offset="25%"  stopColor="#8a7d68" stopOpacity={0.7}/>
          <Stop offset="55%"  stopColor="#d4a855" stopOpacity={0.9}/>
          <Stop offset="70%"  stopColor="#e8a642" stopOpacity={1}/>
          <Stop offset="85%"  stopColor="#d67b3a" stopOpacity={0.8}/>
          <Stop offset="100%" stopColor="#c04f3c" stopOpacity={0.6}/>
        </LinearGradient>
      </Defs>

      <Line x1={30} y1={250} x2={470} y2={250} stroke="rgba(200,160,90,0.15)" strokeDasharray="2,4"/>

      <Path
        d="M 30 240 Q 90 235, 130 220 T 210 170 Q 240 140, 260 100 Q 275 70, 290 60 Q 305 75, 325 110 T 390 220 Q 430 250, 470 255"
        fill="none"
        stroke="url(#cycleGrad)"
        strokeWidth={2.5}
      />

      {(Object.entries(PHASE_POS) as [CyclePhase, typeof PHASE_POS[CyclePhase]][]).map(([p, pos]) => {
        const isCurrent  = p === current;
        const isMonthAgo = p === monthAgo && p !== current;
        const phaseKr =
          p === "DISBELIEF" ? "불신" : p === "HOPE" ? "희망" : p === "OPTIMISM" ? "낙관" :
          p === "BELIEF" ? "확신" : p === "THRILL" ? "짜릿함" : p === "EUPHORIA" ? "도취" :
          p === "COMPLACENCY" ? "안주" : p === "ANXIETY" ? "불안" : p === "DENIAL" ? "부정" :
          p === "PANIC" ? "공포" : "항복";

        return (
          <G key={p}>
            <Circle
              cx={pos.x} cy={pos.y}
              r={isCurrent ? 7 : isMonthAgo ? 5 : 3}
              fill={isCurrent ? T.amber : isMonthAgo ? T.fear : T.inkMuted}
              opacity={isCurrent ? 1 : isMonthAgo ? 0.85 : 0.7}
            />
            {isCurrent && (
              <Circle cx={pos.x} cy={pos.y} r={13} fill="none" stroke={T.amber} strokeWidth={1} opacity={0.45}/>
            )}
            <SvgText
              x={pos.x} y={pos.lblY}
              fontSize={isCurrent ? 11 : 10}
              fill={isCurrent ? T.amber : isMonthAgo ? T.fear : T.inkMuted}
              fontWeight={isCurrent ? "700" : "500"}
              textAnchor="middle"
            >
              {phaseKr}
            </SvgText>
            <SvgText
              x={pos.x} y={pos.enY}
              fontSize={9}
              fontStyle="italic"
              fill={isCurrent ? T.amber : T.inkMuted}
              opacity={isCurrent ? 1 : 0.7}
              textAnchor="middle"
            >
              {PHASE_EN[p]}
            </SvgText>
            {isCurrent && (
              <SvgText x={pos.x} y={pos.y + 22} fontSize={9} fill={T.amber} fontWeight="700" textAnchor="middle">
                ▲ 현재
              </SvgText>
            )}
            {isMonthAgo && (
              <SvgText x={pos.x} y={pos.y + 18} fontSize={8} fill={T.fear} textAnchor="middle">
                · 한달전
              </SvgText>
            )}
          </G>
        );
      })}

      <SvgText x={30}  y={310} fontSize={9} fontStyle="italic" fill={T.inkMuted}>← 저점</SvgText>
      <SvgText x={465} y={310} fontSize={9} fontStyle="italic" fill={T.inkMuted} textAnchor="end">다음 사이클 →</SvgText>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function FgGauge({ score, level }: { score: number; level: FgLevel }) {
  // 0-100 → -54도 회전 (HTML 시안 그대로)
  const angle = -90 + (score / 100) * 180;
  const color = FG_COLOR[level];

  return (
    <Svg viewBox="0 0 300 200" width="100%" height={180}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor={T.fear}/>
          <Stop offset="25%"  stopColor="#6b8d9c"/>
          <Stop offset="50%"  stopColor={T.neutral}/>
          <Stop offset="75%"  stopColor={T.greed}/>
          <Stop offset="100%" stopColor={T.extreme}/>
        </LinearGradient>
      </Defs>

      <Path d="M 40 150 A 110 110 0 0 1 260 150" fill="none" stroke={T.bgInset}    strokeWidth={22}/>
      <Path d="M 40 150 A 110 110 0 0 1 260 150" fill="none" stroke="url(#gaugeGrad)" strokeWidth={20} opacity={0.9}/>

      <SvgText x={38}  y={172} fontSize={9} fill={T.inkMuted} textAnchor="middle">0</SvgText>
      <SvgText x={150} y={32}  fontSize={9} fill={T.inkMuted} textAnchor="middle">50</SvgText>
      <SvgText x={262} y={172} fontSize={9} fill={T.inkMuted} textAnchor="middle">100</SvgText>

      <SvgText x={55}  y={170} fontSize={8} fontStyle="italic" fill={T.inkMuted}>Extreme Fear</SvgText>
      <SvgText x={245} y={170} fontSize={8} fontStyle="italic" fill={T.inkMuted} textAnchor="end">Extreme Greed</SvgText>

      {/* 바늘 */}
      <G transform={`translate(150,150) rotate(${angle})`}>
        <Line x1={0} y1={0} x2={0} y2={-95} stroke={color} strokeWidth={3} strokeLinecap="round"/>
        <Circle cx={0} cy={0} r={7} fill={T.bgCard} stroke={color} strokeWidth={2.5}/>
      </G>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function MarketCycleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [market, setMarket] = useState<Market>("us");
  const { data, loading, error, refresh } = useMarketIntel(market);

  const dateStr = useMemo(() => {
    const d = data?.asOf ? new Date(data.asOf) : new Date();
    return `${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()]} ${d.getDate()} · ${d.getFullYear()}`;
  }, [data?.asOf]);

  return (
    <View style={[s.root, { backgroundColor: T.bg, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }}/>

      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={T.gold}/>
        </TouchableOpacity>
        <Text style={s.headerTitle}>The Eye</Text>
        <TouchableOpacity onPress={refresh} style={s.backBtn}>
          <Ionicons name="refresh" size={20} color={T.inkDim}/>
        </TouchableOpacity>
      </View>

      {/* 시장 토글 */}
      <View style={s.tabRow}>
        {([
          { id: "us" as Market, label: "미장",   sub: "S&P 500 · VIX" },
          { id: "kr" as Market, label: "국장",   sub: "KOSPI · 변동성" },
        ]).map((t) => {
          const active = market === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setMarket(t.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
              <Text style={[s.tabSub, active && s.tabSubActive]}>{t.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={T.gold}/>}
      >
        <View style={s.heroWrap}>
          <View style={s.eyebrowRow}>
            <View style={s.eyebrowDot}/>
            <Text style={s.eyebrow}>LIVE MARKET INTELLIGENCE</Text>
          </View>
          <Text style={s.h1}>
            폭풍의 눈 <Text style={s.h1Em}>— The Eye</Text>
          </Text>
          <View style={s.metaRow}>
            <Text style={s.meta}>{dateStr}</Text>
            {data && <Text style={s.meta}>{data.index.name} · {data.index.price.toLocaleString()}</Text>}
            {data && <Text style={s.meta}>{data.volIndex.name} · {data.volIndex.price.toFixed(1)}</Text>}
          </View>
        </View>

        {loading && !data && <ActivityIndicator color={T.gold} style={{ margin: 40 }}/>}
        {error && !data && <Text style={s.errTxt}>데이터 로드 실패 — 새로고침</Text>}

        {data && (
          <>
            {/* SECTION 1: 시장 사이클 */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>01</Text>
                <Text style={s.h2}>시장 심리 사이클 — 현재 위치</Text>
              </View>
              <Text style={s.sectionNote}>
                월스트리트 심리 사이클상 추정 위치.{" "}
                <Text style={{ color: T.amber, fontWeight: "700" }}>
                  {data.cycle.phaseKr}({PHASE_EN[data.cycle.phase]})
                </Text>{" "}
                구간.
              </Text>

              <View style={s.card}>
                <CycleSvg current={data.cycle.phase} monthAgo={data.cycle.monthAgoPhase}/>

                <View style={s.cycleLegend}>
                  <View style={s.legendItem}>
                    <Text style={s.legendLabel}>현재 추정</Text>
                    <Text style={[s.legendVal, { color: T.amber }]}>
                      {data.cycle.phaseKr} ({PHASE_EN[data.cycle.phase]})
                    </Text>
                  </View>
                  <View style={s.legendItem}>
                    <Text style={s.legendLabel}>한 달 전</Text>
                    <Text style={s.legendVal}>
                      {data.cycle.monthAgoPhaseKr} ({PHASE_EN[data.cycle.monthAgoPhase]})
                    </Text>
                  </View>
                  <View style={s.legendItem}>
                    <Text style={s.legendLabel}>다음 구간 리스크</Text>
                    <Text style={[s.legendVal, { color: T.amber }]}>
                      {data.cycle.nextRiskPhaseKr} ({PHASE_EN[data.cycle.nextRiskPhase]})
                    </Text>
                  </View>
                </View>

                <Text style={s.cycleRationale}>{data.cycle.rationale}</Text>
              </View>
            </View>

            {/* SECTION 1.5: 행동 수칙 (현재 국면 기준) */}
            {(() => {
              const pb = playbookFor(data.cycle.phase);
              return (
                <View style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={s.sectionNum}>1.5</Text>
                    <Text style={s.h2}>지금 해야 할 것 / 피해야 할 것</Text>
                  </View>
                  <View style={[s.card, { borderColor: pb.color + "55", borderWidth: 1 }]}>
                    <View style={pbStyles.head}>
                      <Text style={pbStyles.emoji}>{pb.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[pbStyles.label, { color: pb.color }]}>{pb.label}</Text>
                        <Text style={pbStyles.summary}>{pb.summary}</Text>
                      </View>
                    </View>

                    <PbBlock title="진입" items={pb.rules.entry} accent={pb.color} />
                    <PbBlock title="익절·손절" items={pb.rules.exit} accent={pb.color} />
                    <PbBlock title="사이즈" items={pb.rules.sizing} accent={pb.color} />
                    <PbBlock title="피해야 할 행동" items={pb.rules.avoid} accent="#F04452" />
                  </View>
                </View>
              );
            })()}

            {/* SECTION 2: 공포 탐욕 */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>02</Text>
                <Text style={s.h2}>공포-탐욕 지수</Text>
              </View>
              <Text style={s.sectionNote}>
                한 달 전 {data.fearGreed.history.monthAgo} → 현재 {data.fearGreed.score} (
                {data.fearGreed.score - data.fearGreed.history.monthAgo >= 0 ? "+" : ""}
                {data.fearGreed.score - data.fearGreed.history.monthAgo}pt)
              </Text>

              <View style={s.card}>
                <View style={s.gaugeWrap}>
                  <FgGauge score={data.fearGreed.score} level={data.fearGreed.level}/>
                  <View style={s.gaugeCenter}>
                    <Text style={[s.gaugeNumber, { color: FG_COLOR[data.fearGreed.level] }]}>
                      {data.fearGreed.score}
                    </Text>
                    <Text style={[s.gaugeLabel, { color: FG_COLOR[data.fearGreed.level] }]}>
                      {FG_LABEL[data.fearGreed.level]}
                    </Text>
                  </View>
                </View>

                {/* 히스토리 */}
                <View style={s.fgHistory}>
                  {([
                    { time: "1달 전", val: data.fearGreed.history.monthAgo },
                    { time: "1주 전", val: data.fearGreed.history.weekAgo  },
                    { time: "현재",   val: data.fearGreed.score             },
                  ] as const).map((h, i) => {
                    const lvl = h.val <= 24 ? "EXTREME_FEAR" : h.val <= 44 ? "FEAR" : h.val <= 55 ? "NEUTRAL" : h.val <= 75 ? "GREED" : "EXTREME_GREED";
                    return (
                      <View key={i} style={s.fgHistItem}>
                        <Text style={s.fgHistTime}>{h.time}</Text>
                        <Text style={[s.fgHistVal, { color: FG_COLOR[lvl as FgLevel] }]}>{h.val}</Text>
                        <Text style={s.fgHistDesc}>{FG_LABEL[lvl as FgLevel]}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* 컴포넌트 */}
                <View style={{ gap: 6 }}>
                  {data.fearGreed.components.map((cmp) => (
                    <View key={cmp.key} style={s.compRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.compNameKr}>{cmp.labelKr}</Text>
                        <Text style={s.compNameEn} numberOfLines={1}>{cmp.labelEn} · {cmp.detail}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: FG_COLOR[cmp.level] + "22", borderColor: FG_COLOR[cmp.level] + "55" }]}>
                        <Text style={[s.badgeTxt, { color: FG_COLOR[cmp.level] }]}>{FG_LABEL[cmp.level]}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* SECTION 3: 리스크 */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>03</Text>
                <Text style={s.h2}>대형 하락 잠재 트리거</Text>
              </View>
              <Text style={s.sectionNote}>
                현재 시장이 <Text style={{ color: T.amber, fontStyle: "italic" }}>가격에 충분히 반영하지 않은</Text> 하락 요인. 위험도 순.
              </Text>

              <View style={{ paddingHorizontal: 16, gap: 10 }}>
                {data.risks.map((r, i) => (
                  <View key={i} style={[s.riskCard, { borderLeftColor: SEV_COLOR[r.severity] }]}>
                    <View style={s.riskHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.riskCat}>{r.category}</Text>
                        <Text style={s.riskTitle}>{r.title}</Text>
                      </View>
                      <View style={[s.sevBadge, { backgroundColor: SEV_COLOR[r.severity] + "22" }]}>
                        <Text style={[s.sevTxt, { color: SEV_COLOR[r.severity] }]}>{r.severity}</Text>
                      </View>
                    </View>
                    <Text style={s.riskMetric}>{r.metric}</Text>
                    <Text style={s.riskDesc}>{r.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* SECTION 4: 자본순환 사이클 */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>04</Text>
                <Text style={s.h2}>자본순환 사이클 — Pring 인터마켓</Text>
              </View>
              <Text style={s.sectionNote}>
                채권·주식·원자재 3개월 상대강도로 본 글로벌 자본 순환 단계.{" "}
                <Text style={{ color: T.amber, fontWeight: "700" }}>
                  {data.capitalRotation.phaseKr}({data.capitalRotation.phaseEn})
                </Text>{" "}
                구간.
              </Text>

              <View style={s.card}>
                {/* 4단계 사분면 */}
                <View style={s.capGrid}>
                  {([
                    { key: "RECOVERY"  as const, label: "회복",   en: "Recovery",   sub: "채권↑ 주식 바닥" },
                    { key: "EXPANSION" as const, label: "확장",   en: "Expansion",  sub: "주식↑ 인플레 잠잠" },
                    { key: "OVERHEAT"  as const, label: "과열",   en: "Overheat",   sub: "원자재↑ 금리상승" },
                    { key: "SLOWDOWN"  as const, label: "둔화",   en: "Slowdown",   sub: "주식·원자재 약세" },
                  ]).map((p) => {
                    const active = p.key === data.capitalRotation.phase;
                    return (
                      <View
                        key={p.key}
                        style={[
                          s.capCell,
                          active && { borderColor: T.amber, backgroundColor: "rgba(212,168,85,0.08)" },
                        ]}
                      >
                        <Text style={[s.capLabel, active && { color: T.amber }]}>{p.label}</Text>
                        <Text style={[s.capLabelEn, active && { color: T.gold }]}>{p.en}</Text>
                        <Text style={s.capSub}>{p.sub}</Text>
                        {active && <Text style={s.capCurrent}>▲ 현재</Text>}
                      </View>
                    );
                  })}
                </View>

                {/* 자산별 1M/3M 수익률 */}
                <View style={s.capAssets}>
                  {([
                    { key: "bonds"       as const, color: T.fear  },
                    { key: "stocks"      as const, color: T.amber },
                    { key: "commodities" as const, color: T.greed },
                  ]).map(({ key, color }) => {
                    const a = data.capitalRotation.assets[key];
                    const isLeader = data.capitalRotation.leader === key;
                    return (
                      <View key={key} style={s.capAssetRow}>
                        <View style={{ flex: 1.4, gap: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={[s.capDot, { backgroundColor: color }]}/>
                            <Text style={s.capAssetName}>{a.name}</Text>
                            {isLeader && <Text style={s.capLeaderTag}>LEADER</Text>}
                          </View>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={s.capRetLabel}>1M</Text>
                          <Text style={[s.capRetVal, { color: a.return1m >= 0 ? T.greed : T.fear }]}>
                            {a.return1m >= 0 ? "+" : ""}{a.return1m.toFixed(1)}%
                          </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={s.capRetLabel}>3M</Text>
                          <Text style={[s.capRetVal, { color: a.return3m >= 0 ? T.greed : T.fear }]}>
                            {a.return3m >= 0 ? "+" : ""}{a.return3m.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <Text style={s.cycleRationale}>{data.capitalRotation.rationale}</Text>
              </View>
            </View>

            {/* SECTION 5: 섹터 자본순환 */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>05</Text>
                <Text style={s.h2}>섹터 자본순환 — 상대강도 순위</Text>
              </View>
              <Text style={s.sectionNote}>
                12개 미국 섹터 ETF의 S&P 500 대비 3M 상대강도.{" "}
                <Text style={{ color: T.amber, fontWeight: "700" }}>
                  {data.sectorRotation.phaseHintKr}
                </Text>
              </Text>

              <View style={s.card}>
                {(() => {
                  const maxAbs = Math.max(
                    ...data.sectorRotation.sectors.map(x => Math.abs(x.relStr3m)),
                    1,
                  );
                  return data.sectorRotation.sectors.map((sec, i) => {
                    const isTop3 = i < 3;
                    const isBot3 = i >= data.sectorRotation.sectors.length - 3;
                    const barWidth = (Math.abs(sec.relStr3m) / maxAbs) * 100;
                    const positive = sec.relStr3m >= 0;
                    const color = positive ? T.greed : T.fear;
                    const groupColor: Record<typeof sec.group, string> = {
                      growth:     "#a877d4",
                      cyclical:   T.amber,
                      energy_mat: T.warning,
                      defensive:  "#7896b0",
                      financial:  T.gold,
                    };
                    return (
                      <View key={sec.ticker} style={s.sectorRow}>
                        <View style={[s.sectorGroupDot, { backgroundColor: groupColor[sec.group] }]}/>
                        <View style={{ flex: 1.6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Text style={[s.sectorName, isTop3 && { color: T.amber, fontFamily: "Inter_700Bold" }]}>
                              {sec.name}
                            </Text>
                            {isTop3 && i === 0 && (
                              <Text style={s.sectorTopTag}>TOP</Text>
                            )}
                            {isBot3 && i === data.sectorRotation.sectors.length - 1 && (
                              <Text style={s.sectorBotTag}>BOT</Text>
                            )}
                          </View>
                          <Text style={s.sectorTicker}>{sec.ticker}</Text>
                        </View>
                        <View style={{ flex: 2.2, alignItems: "flex-start", gap: 2 }}>
                          <View style={s.sectorBarWrap}>
                            <View style={[
                              s.sectorBar,
                              { width: `${barWidth}%`, backgroundColor: color + "55", borderColor: color + "AA" },
                            ]}/>
                          </View>
                          <Text style={[s.sectorRelVal, { color }]}>
                            상대강도 {sec.relStr3m >= 0 ? "+" : ""}{sec.relStr3m.toFixed(1)}%p
                          </Text>
                        </View>
                        <View style={{ flex: 0.9, alignItems: "flex-end" }}>
                          <Text style={s.sectorRetLabel}>3M</Text>
                          <Text style={[s.sectorRetVal, { color: sec.return3m >= 0 ? T.greed : T.fear }]}>
                            {sec.return3m >= 0 ? "+" : ""}{sec.return3m.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    );
                  });
                })()}

                <Text style={s.cycleRationale}>{data.sectorRotation.rationale}</Text>
              </View>
            </View>

            <Text style={s.footer}>
              데이터 · Yahoo Finance{"\n"}최종 업데이트 · {new Date(data.asOf).toLocaleString("ko-KR")}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PbBlock({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <View style={pbStyles.block}>
      <Text style={[pbStyles.blockTitle, { color: accent }]}>{title}</Text>
      {items.map((it, i) => (
        <View key={i} style={pbStyles.row}>
          <Text style={[pbStyles.bullet, { color: accent }]}>•</Text>
          <Text style={pbStyles.itemText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  head:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  emoji:      { fontSize: 28 },
  label:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  summary:    { fontSize: 12, color: T.inkDim, marginTop: 2, lineHeight: 18 },
  block:      { gap: 4, marginTop: 10 },
  blockTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  row:        { flexDirection: "row", gap: 8, paddingLeft: 4 },
  bullet:     { fontSize: 13, width: 10, fontFamily: "Inter_700Bold" },
  itemText:   { flex: 1, fontSize: 13, color: T.ink, lineHeight: 19 },
});

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.lineStr,
  },
  backBtn:     { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: T.gold, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },

  tabRow:      {
    flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.lineStr,
  },
  tab:         {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: T.line, backgroundColor: T.bgInset,
    borderRadius: 2, alignItems: "center", gap: 2,
  },
  tabActive:   { borderColor: T.amber, backgroundColor: "rgba(212,168,85,0.08)" },
  tabLabel:    { color: T.inkDim, fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  tabLabelActive: { color: T.amber },
  tabSub:      { color: T.inkMuted, fontSize: 9, letterSpacing: 0.8 },
  tabSubActive: { color: T.gold },

  heroWrap:    { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.lineStr },
  eyebrowRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  eyebrowDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber },
  eyebrow:     { color: T.gold, fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 2.4 },
  h1:          { color: T.ink, fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 10 },
  h1Em:        { color: T.gold, fontStyle: "italic", fontFamily: "Inter_400Regular", fontSize: 24 },
  metaRow:     { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  meta:        { color: T.inkMuted, fontSize: 11, letterSpacing: 1 },

  section:     { marginTop: 32 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", gap: 12, paddingHorizontal: 20, marginBottom: 8 },
  sectionNum:  { color: T.gold, fontSize: 22, fontStyle: "italic", fontFamily: "Inter_400Regular" },
  h2:          { color: T.ink, fontSize: 19, fontFamily: "Inter_700Bold" },
  sectionNote: { color: T.inkDim, fontSize: 12, paddingHorizontal: 20, paddingLeft: 54, marginBottom: 16, lineHeight: 18 },

  card:        {
    backgroundColor: T.bgCard, borderColor: T.line, borderWidth: 1,
    marginHorizontal: 16, padding: 16, gap: 12, borderRadius: 2,
  },

  cycleLegend: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    paddingTop: 16, marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.line,
  },
  legendItem:  { flex: 1, minWidth: 100 },
  legendLabel: { color: T.inkMuted, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  legendVal:   { color: T.ink, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cycleRationale: { color: T.inkDim, fontSize: 11, marginTop: 6, fontStyle: "italic" },

  gaugeWrap:   { alignItems: "center", marginVertical: 4 },
  gaugeCenter: { position: "absolute", top: "55%", left: 0, right: 0, alignItems: "center" },
  gaugeNumber: { fontSize: 56, fontFamily: "Inter_700Bold", lineHeight: 60, letterSpacing: -1 },
  gaugeLabel:  { fontSize: 11, letterSpacing: 2.4, marginTop: 2, fontFamily: "Inter_600SemiBold" },

  fgHistory:   {
    flexDirection: "row", justifyContent: "space-between", gap: 8,
    paddingVertical: 14, marginVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.line, borderBottomColor: T.line,
  },
  fgHistItem:  { flex: 1, alignItems: "center" },
  fgHistTime:  { color: T.inkMuted, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  fgHistVal:   { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  fgHistDesc:  { color: T.inkMuted, fontSize: 10, marginTop: 2 },

  compRow:     {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line,
  },
  compNameKr:  { color: T.ink, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  compNameEn:  { color: T.inkMuted, fontSize: 10, fontStyle: "italic" },
  badge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 2, borderWidth: 1 },
  badgeTxt:    { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },

  riskCard:    {
    backgroundColor: T.bgCard, borderColor: T.line, borderWidth: 1,
    borderLeftWidth: 3, padding: 14, gap: 6, borderRadius: 2,
  },
  riskHead:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  riskCat:     { color: T.inkMuted, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  riskTitle:   { color: T.ink, fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 19 },
  sevBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  sevTxt:      { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  riskMetric:  { color: T.gold, fontSize: 10, marginTop: 2, letterSpacing: 0.4 },
  riskDesc:    { color: T.inkDim, fontSize: 12, lineHeight: 18, marginTop: 2 },

  capGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  capCell:     {
    width: "48%", borderWidth: 1, borderColor: T.line, padding: 12, borderRadius: 4,
    backgroundColor: T.bgInset, gap: 2,
  },
  capLabel:    { color: T.ink,      fontSize: 14, fontFamily: "Inter_700Bold" },
  capLabelEn:  { color: T.inkMuted, fontSize: 10, fontStyle: "italic" },
  capSub:      { color: T.inkDim,   fontSize: 10, marginTop: 4, lineHeight: 14 },
  capCurrent:  { color: T.amber,    fontSize: 10, fontFamily: "Inter_700Bold", marginTop: 4 },

  capAssets:   {
    paddingTop: 14, marginTop: 8, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.line,
  },
  capAssetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  capDot:      { width: 8, height: 8, borderRadius: 4 },
  capAssetName:{ color: T.ink, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  capLeaderTag:{
    color: T.amber, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1,
    paddingHorizontal: 5, paddingVertical: 1,
    borderWidth: 1, borderColor: T.amber, borderRadius: 2, marginLeft: 4,
  },
  capRetLabel: { color: T.inkMuted, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  capRetVal:   { fontSize: 13, fontFamily: "Inter_700Bold" },

  sectorRow:        { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  sectorGroupDot:   { width: 6, height: 36, borderRadius: 1 },
  sectorName:       { color: T.ink, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectorTicker:     { color: T.inkMuted, fontSize: 10, fontStyle: "italic" },
  sectorTopTag:     {
    color: T.amber, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: T.amber, borderRadius: 2,
  },
  sectorBotTag:     {
    color: T.fear, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: T.fear, borderRadius: 2,
  },
  sectorBarWrap:    {
    width: "100%", height: 8, backgroundColor: T.bgInset, borderRadius: 1, overflow: "hidden",
  },
  sectorBar:        { height: "100%", borderRadius: 1, borderWidth: 1 },
  sectorRelVal:     { fontSize: 9, fontFamily: "Inter_500Medium" },
  sectorRetLabel:   { color: T.inkMuted, fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  sectorRetVal:     { fontSize: 12, fontFamily: "Inter_700Bold" },

  footer:      {
    color: T.inkMuted, fontStyle: "italic", textAlign: "center",
    paddingVertical: 32, paddingHorizontal: 20, fontSize: 11, lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.line,
    marginTop: 32, marginHorizontal: 16,
  },
  errTxt:      { color: T.danger, textAlign: "center", padding: 24, fontSize: 13 },
});
