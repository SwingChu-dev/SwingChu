import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";

type Tab = "disclaimer" | "privacy" | "terms";

const TABS: { key: Tab; label: string }[] = [
  { key: "disclaimer", label: "투자 면책" },
  { key: "privacy",    label: "개인정보" },
  { key: "terms",      label: "이용약관" },
];

const DISCLAIMER = `본 앱(스윙의 정석)은 자본시장과 금융투자업에 관한 법률(이하 "자본시장법")상 투자자문업·투자권유 서비스가 아닙니다. 단순 시장 정보·기술 지표·AI 보조 분석을 제공할 뿐입니다.

1. 정보의 한계
   - 본 앱이 제공하는 모든 가격·지표·뉴스·AI 분석은 참고 정보입니다.
   - 데이터 출처(Yahoo Finance, KIS Open API 등)의 지연·오류·결측에 대해 본 앱은 책임지지 않습니다.
   - AI 분석(Claude Haiku/Sonnet)은 통계적 추론이며 투자 자문이 아닙니다.

2. 투자 책임
   - 모든 매매 결정과 그에 따른 손익은 전적으로 사용자 본인에게 있습니다.
   - 주식 투자에는 원금 손실 위험이 있으며 과거 수익률이 미래 수익을 보장하지 않습니다.
   - 본 앱의 신호·점수·권고로 인해 발생한 손실에 대해 본 앱은 책임지지 않습니다.

3. 권장 사용 방식
   - 본인의 투자 성향·기간·손실 감내 한도를 고려해 사용하세요.
   - 본 앱 정보를 근거로 한 단독 매매를 지양하고, 정식 분석·공시·뉴스를 함께 검토하세요.
   - 의문이 있으면 자격을 갖춘 투자 자문 전문가와 상담하세요.`;

const PRIVACY = `본 앱은 사용자의 개인정보를 최소한으로 수집·처리합니다.

1. 수집·처리 항목
   - 사용자가 직접 입력한 정보: 관심종목 ID, 보유 포지션(티커·수량·평단·진입일), 매매 메모, 알림 설정
   - 자동 수집: 시세 조회 시 종목 티커 (외부 시세 API 호출용)
   - 본 앱은 별도 회원가입·이름·연락처를 수집하지 않습니다.

2. 처리 목적
   - 관심종목·포지션 표시, 알림 발송, 통계 계산, AI 분석 입력 컨텍스트 구성

3. 보유 기간
   - 사용자 단말 내 AsyncStorage에 저장. 앱 삭제 또는 데이터 백업/복원 화면의 "복원" 기능으로 덮어쓸 때 즉시 소멸.
   - 서버에 별도 저장하지 않습니다.

4. 제3자 처리 위탁
   - 시세 조회: Yahoo Finance, 한국투자증권 Open API
   - AI 분석: Anthropic (Claude API) — 종목 티커·기술 지표·사용자 질의가 분석 입력으로 전송됨. 실명·계좌·결제 정보는 전송되지 않습니다.
   - 푸시 알림: Apple Push Notification, Google Firebase Cloud Messaging — 알림 토큰만 사용.

5. 사용자 권리
   - 모든 데이터는 단말 로컬에 있으므로 앱 삭제 시 완전 소멸합니다.
   - 백업 파일을 외부에 저장한 경우 사용자 본인이 관리해야 합니다.

6. 보안
   - HTTPS 통신, AsyncStorage(앱 샌드박스) 저장. 단말 분실 시 잠금이 보안의 1차 방어선입니다.`;

const TERMS = `1. 서비스 정의
   - 본 앱(스윙의 정석)은 한국·미국 주식 시장 정보, 기술 분석 지표, AI 보조 코멘트를 제공하는 개인용 분석 도구입니다.
   - 회원가입 없이 단말 단위로 사용합니다.

2. 사용 자격
   - 만 19세 이상 사용을 권장합니다.
   - 본 앱은 정식 자본시장법상 투자자문업·집합투자기구 운영업 등 인허가 사업이 아닙니다.

3. 금지 행위
   - 본 앱의 정보를 무단 복제·재배포·상업 이용하는 행위
   - 시세 API·AI API에 대한 자동화된 과다 호출 등 시스템 부하를 유발하는 행위
   - 본 앱의 정보를 근거로 타인에게 투자를 권유·중개하는 행위 (자본시장법 위반 소지)

4. 서비스 변경·중단
   - 외부 데이터 출처 변경, 인프라 장애, 정책 변경 등으로 서비스가 무통보로 변경·중단될 수 있습니다.
   - 운영 중단 시 사용자 데이터(로컬)는 영향받지 않으나 시세·분석은 더 이상 갱신되지 않을 수 있습니다.

5. 면책
   - 본 앱은 정보의 정확성·완결성·실시간성을 보증하지 않습니다.
   - 본 앱의 정보를 근거로 한 일체의 의사 결정과 그 결과는 사용자 책임입니다.

6. 분쟁 해결
   - 한국 법령에 따릅니다.`;

export default function LegalScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? "disclaimer");

  const body = tab === "privacy" ? PRIVACY : tab === "terms" ? TERMS : DISCLAIMER;

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>법적 문서</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={s.tabRow}>
        {TABS.map((t) => {
          const selected = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                s.tabBtn,
                {
                  backgroundColor: selected ? c.tint : c.card,
                  borderColor: selected ? c.tint : c.cardBorder,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, { color: selected ? "#fff" : c.text }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.body, { color: c.text }]}>{body}</Text>
        </View>
        <Text style={[s.version, { color: c.textTertiary }]}>
          최종 업데이트: 2026-05-06 · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: { borderRadius: 14, padding: 18 },
  body: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular" },
  version: { fontSize: 11, textAlign: "center", marginTop: 8 },
});
