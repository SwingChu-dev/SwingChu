import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useKis, KisGroup } from "@/context/KisContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useEnrichment } from "@/context/EnrichmentContext";
import Colors from "@/constants/colors";

function fmtTime(d: Date | null): string {
  if (!d) return "없음";
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)   return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function KisConnectScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const {
    credentials, isConnected, groups, lastSync, totalCount,
    syncStatus, syncError, verifying,
    connect, disconnect, syncWatchlist,
  } = useKis();

  const { addFromUniverse, isInWatchlist } = useWatchlist();
  const { enrichStock } = useEnrichment();

  const [appkey,    setAppkey]    = useState(credentials?.appkey    ?? "");
  const [appsecret, setAppsecret] = useState(credentials?.appsecret ?? "");
  const [showSecret, setShowSecret] = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [importDone, setImportDone] = useState<string | null>(null);

  // ── 연결 ────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    if (!appkey.trim() || !appsecret.trim()) {
      Alert.alert("입력 오류", "App Key와 App Secret을 모두 입력해주세요.");
      return;
    }
    const ok = await connect({ appkey: appkey.trim(), appsecret: appsecret.trim() });
    if (ok) {
      Alert.alert("연결 성공", "한국투자증권 계정이 연결되었습니다.");
    } else {
      Alert.alert("연결 실패", syncError ?? "App Key 또는 App Secret을 확인해주세요.");
    }
  }, [appkey, appsecret, connect, syncError]);

  // ── 연결 해제 ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "연결 해제",
      "한국투자증권 계정 연동을 해제하시겠습니까?\n저장된 인증 정보가 모두 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "해제",
          style: "destructive",
          onPress: () => {
            disconnect();
            setAppkey("");
            setAppsecret("");
            setImportDone(null);
          },
        },
      ]
    );
  }, [disconnect]);

  // ── 관심종목 가져오기 ─────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    const result = await syncWatchlist();
    if (result.length > 0) {
      setImportDone(null);
    }
  }, [syncWatchlist]);

  // ── 앱에 추가 ────────────────────────────────────────────────────────────
  const handleImportAll = useCallback(async (targetGroups: KisGroup[]) => {
    setImporting(true);
    let added = 0;
    let skipped = 0;

    for (const g of targetGroups) {
      for (const s of g.stocks) {
        const id = `${s.ticker.toLowerCase()}_kis`;
        if (isInWatchlist(id)) {
          skipped++;
          continue;
        }
        const price = 0; // 가격은 나중에 enrichment 시 채워짐
        addFromUniverse({
          id,
          name:         s.name,
          nameEn:       s.ticker,
          ticker:       s.ticker,
          market:       s.market,
          sector:       "KIS 관심종목",
          currentPrice: price,
          marketCap:    "-",
        });
        enrichStock(id, s.ticker, s.market);
        added++;
      }
    }

    setImporting(false);
    setImportDone(`${added}개 추가, ${skipped}개 이미 있음`);
  }, [addFromUniverse, enrichStock, isInWatchlist]);

  const handleImportGroup = useCallback(async (g: KisGroup) => {
    setImporting(true);
    let added = 0;

    for (const s of g.stocks) {
      const id = `${s.ticker.toLowerCase()}_kis`;
      if (!isInWatchlist(id)) {
        addFromUniverse({
          id,
          name:         s.name,
          nameEn:       s.ticker,
          ticker:       s.ticker,
          market:       s.market,
          sector:       `KIS - ${g.grpName}`,
          currentPrice: 0,
          marketCap:    "-",
        });
        enrichStock(id, s.ticker, s.market);
        added++;
      }
    }

    setImporting(false);
    Alert.alert("추가 완료", `"${g.grpName}" 그룹에서 ${added}개 종목을 추가했습니다.`);
  }, [addFromUniverse, enrichStock, isInWatchlist]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={["top"]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>KIS 관심종목 연동</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>한국투자증권 Open API</Text>
        </View>
        {isConnected && (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#2DB55D" />
            <Text style={styles.connectedBadgeText}>연결됨</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── API 키 입력 ─────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={18} color="#0064FF" />
            <Text style={[styles.sectionTitle, { color: c.text }]}>API 인증 정보</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>App Key</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? "#1A2035" : "#F5F5F7", color: c.text }]}
            value={appkey}
            onChangeText={setAppkey}
            placeholder="P-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor={c.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />

          <Text style={[styles.fieldLabel, { color: c.textSecondary, marginTop: 12 }]}>App Secret</Text>
          <View style={styles.secretRow}>
            <TextInput
              style={[styles.input, styles.secretInput, { backgroundColor: isDark ? "#1A2035" : "#F5F5F7", color: c.text }]}
              value={appsecret}
              onChangeText={setAppsecret}
              placeholder="App Secret 입력"
              placeholderTextColor={c.textTertiary}
              secureTextEntry={!showSecret}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnected}
            />
            <TouchableOpacity
              style={[styles.eyeBtn, { backgroundColor: isDark ? "#1A2035" : "#F5F5F7" }]}
              onPress={() => setShowSecret((v) => !v)}
            >
              <Ionicons name={showSecret ? "eye-off-outline" : "eye-outline"} size={18} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 연결/해제 버튼 */}
          {!isConnected ? (
            <TouchableOpacity
              style={[styles.primaryBtn, (verifying) && { opacity: 0.6 }]}
              onPress={handleConnect}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="link" size={17} color="#fff" />
              )}
              <Text style={styles.primaryBtnText}>
                {verifying ? "인증 확인 중..." : "KIS 계정 연결"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Ionicons name="unlink-outline" size={17} color="#F04452" />
              <Text style={styles.disconnectBtnText}>연결 해제</Text>
            </TouchableOpacity>
          )}

          {/* API 키 발급 링크 */}
          {!isConnected && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL("https://apiportal.koreainvestment.com/apiservice/oauth2#L_5c87ba63-740a-4166-93ac-803510bb9c02")}
            >
              <Ionicons name="open-outline" size={13} color="#0064FF" />
              <Text style={styles.linkText}>API 키 발급받기 (KIS Developers)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 안내 ─────────────────────────────────────────────────── */}
        {!isConnected && (
          <View style={[styles.guideCard, { backgroundColor: isDark ? "#1A1A2E" : "#EEF2FF" }]}>
            <Text style={[styles.guideTitle, { color: c.text }]}>발급 방법</Text>
            {[
              "KIS Developers 사이트에 로그인",
              "우측 상단 > 계좌 연결 및 앱 등록",
              "앱 등록 후 App Key / App Secret 복사",
              "위 입력란에 붙여넣기 후 연결",
            ].map((step, i) => (
              <View key={i} style={styles.guideStep}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.guideStepText, { color: c.textSecondary }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 연결된 상태: 관심종목 동기화 ──────────────────────────── */}
        {isConnected && (
          <>
            {/* 동기화 버튼 */}
            <View style={[styles.section, { backgroundColor: c.card }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sync-outline" size={18} color="#0064FF" />
                <Text style={[styles.sectionTitle, { color: c.text }]}>관심종목 가져오기</Text>
              </View>
              <View style={styles.syncInfoRow}>
                <Text style={[styles.syncInfoLabel, { color: c.textSecondary }]}>마지막 동기화</Text>
                <Text style={[styles.syncInfoValue, { color: c.text }]}>{fmtTime(lastSync)}</Text>
              </View>
              {totalCount > 0 && (
                <View style={styles.syncInfoRow}>
                  <Text style={[styles.syncInfoLabel, { color: c.textSecondary }]}>KIS 관심종목</Text>
                  <Text style={[styles.syncInfoValue, { color: "#0064FF" }]}>{totalCount}개</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, syncStatus === "syncing" && { opacity: 0.6 }]}
                onPress={handleSync}
                disabled={syncStatus === "syncing"}
              >
                {syncStatus === "syncing" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="cloud-download-outline" size={17} color="#fff" />
                )}
                <Text style={styles.primaryBtnText}>
                  {syncStatus === "syncing" ? "KIS에서 불러오는 중..." : "KIS 관심종목 동기화"}
                </Text>
              </TouchableOpacity>

              {syncStatus === "error" && syncError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#F04452" />
                  <Text style={styles.errorText}>{syncError}</Text>
                </View>
              )}

              {/* 전체 가져오기 */}
              {groups.length > 0 && (
                <TouchableOpacity
                  style={[styles.importAllBtn, importing && { opacity: 0.6 }]}
                  onPress={() => handleImportAll(groups)}
                  disabled={importing}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color="#0064FF" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={16} color="#0064FF" />
                  )}
                  <Text style={styles.importAllText}>전체 관심종목 앱에 추가</Text>
                </TouchableOpacity>
              )}

              {importDone && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#2DB55D" />
                  <Text style={styles.successText}>{importDone}</Text>
                </View>
              )}
            </View>

            {/* 그룹별 종목 목록 */}
            {groups.map((g) => (
              <View key={g.grpNo} style={[styles.groupCard, { backgroundColor: c.card }]}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupTitleRow}>
                    <Ionicons name="folder-outline" size={16} color="#FF6B35" />
                    <Text style={[styles.groupName, { color: c.text }]}>{g.grpName}</Text>
                    <View style={styles.groupCountBadge}>
                      <Text style={styles.groupCountText}>{g.stocks.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.groupImportBtn}
                    onPress={() => handleImportGroup(g)}
                    disabled={importing}
                  >
                    <Text style={styles.groupImportText}>추가</Text>
                  </TouchableOpacity>
                </View>

                {g.stocks.map((s, i) => (
                  <View
                    key={s.ticker}
                    style={[
                      styles.stockRow,
                      i < g.stocks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator }
                    ]}
                  >
                    <View style={[styles.mktDot, {
                      backgroundColor: s.market === "KOSPI" ? "#2DB55D" : "#FF6B35"
                    }]} />
                    <Text style={[styles.stockTicker, { color: c.text }]}>{s.ticker}</Text>
                    <Text style={[styles.stockName, { color: c.textSecondary }]}>{s.name}</Text>
                    <View style={[styles.mktTag, {
                      backgroundColor: s.market === "KOSPI" ? "#2DB55D22" : "#FF6B3522"
                    }]}>
                      <Text style={[styles.mktTagText, {
                        color: s.market === "KOSPI" ? "#2DB55D" : "#FF6B35"
                      }]}>{s.market}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── 보안 안내 ───────────────────────────────────────────── */}
        <View style={[styles.secNote, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#2DB55D" />
          <Text style={[styles.secNoteText, { color: c.textSecondary }]}>
            API 인증 정보는 기기에만 저장되며 외부로 전송되지 않습니다.
            KIS Open API는 조회 전용으로 매매 기능을 사용하지 않습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap:               12,
  },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: 17, fontWeight: "700" },
  headerSub:       { fontSize: 12, marginTop: 1 },
  connectedBadge:  {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "#2DB55D22",
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      12,
  },
  connectedBadgeText: { fontSize: 12, color: "#2DB55D", fontWeight: "700" },

  scroll: { padding: 16, gap: 14, paddingBottom: 60 },

  section: {
    borderRadius: 16,
    padding:      18,
    gap:          10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle:  { fontSize: 16, fontWeight: "700" },

  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: -4 },
  input: {
    borderRadius:      12,
    paddingHorizontal: 14,
    paddingVertical:   12,
    fontSize:          14,
    fontFamily:        "monospace",
  },
  secretRow:  { flexDirection: "row", gap: 8 },
  secretInput:{ flex: 1 },
  eyeBtn: {
    width:           46,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },

  primaryBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    backgroundColor:   "#0064FF",
    borderRadius:      14,
    paddingVertical:   14,
    marginTop:         4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  disconnectBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    borderWidth:       1,
    borderColor:       "#F04452",
    borderRadius:      14,
    paddingVertical:   12,
    marginTop:         4,
  },
  disconnectBtnText: { color: "#F04452", fontWeight: "700", fontSize: 15 },

  linkRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            5,
    justifyContent: "center",
    paddingTop:     4,
  },
  linkText: { fontSize: 13, color: "#0064FF" },

  guideCard: {
    borderRadius: 16,
    padding:      18,
    gap:          10,
  },
  guideTitle:    { fontSize: 14, fontWeight: "700" },
  guideStep:     { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: "#0064FF",
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       1,
  },
  stepNumText:    { color: "#fff", fontSize: 11, fontWeight: "700" },
  guideStepText:  { flex: 1, fontSize: 13, lineHeight: 20 },

  syncInfoRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  syncInfoLabel: { fontSize: 13 },
  syncInfoValue: { fontSize: 13, fontWeight: "600" },

  importAllBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               6,
    borderWidth:       1.5,
    borderColor:       "#0064FF",
    borderRadius:      12,
    paddingVertical:   11,
  },
  importAllText: { color: "#0064FF", fontWeight: "700", fontSize: 14 },

  errorBox: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "#F0445218",
    borderRadius:      10,
    padding:           10,
  },
  errorText: { flex: 1, fontSize: 12, color: "#F04452" },

  successBox: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "#2DB55D18",
    borderRadius:      10,
    padding:           10,
  },
  successText: { flex: 1, fontSize: 12, color: "#2DB55D" },

  groupCard: {
    borderRadius: 16,
    overflow:     "hidden",
  },
  groupHeader: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  groupTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupName:     { fontSize: 15, fontWeight: "700" },
  groupCountBadge: {
    backgroundColor:   "#FF6B3522",
    borderRadius:      8,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  groupCountText: { fontSize: 11, color: "#FF6B35", fontWeight: "700" },
  groupImportBtn: {
    backgroundColor:   "#0064FF",
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   6,
  },
  groupImportText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  stockRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 16,
    paddingVertical:   11,
  },
  mktDot:      { width: 6, height: 6, borderRadius: 3 },
  stockTicker: { fontSize: 13, fontWeight: "700", width: 60 },
  stockName:   { flex: 1, fontSize: 13 },
  mktTag: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
  },
  mktTagText: { fontSize: 10, fontWeight: "700" },

  secNote: {
    borderRadius:  12,
    padding:       14,
    flexDirection: "row",
    gap:           8,
    alignItems:    "flex-start",
  },
  secNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
