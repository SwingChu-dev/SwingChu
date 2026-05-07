import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";
import { useAiQuota } from "@/hooks/useAiQuota";

interface StockContext {
  ticker:        string;
  market:        string;
  name?:         string;
  currentPrice?: number;
  changePct?:    number;
  rsi14?:        number;
  ma20?:         number;
  ma60?:         number;
  high52w?:      number;
  low52w?:       number;
  smartMoneySummary?: string;
}

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  context: StockContext;
}

const SUGGESTIONS = [
  "최근 왜 빠졌어?",
  "이 회사 핵심 위험요소",
  "다음 실적 발표 체크 포인트",
  "분할 매수 전략",
];

export default function StockChatSheet({ visible, onClose, context }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const quota = useAiQuota("chat");

  useEffect(() => {
    if (!visible) {
      setMessages([]);
      setInput("");
      setLoading(false);
    }
  }, [visible]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const allowed = await quota.consume();
    if (!allowed) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: `⚠️ 오늘 ${quota.label} ${quota.limit}건 한도에 도달했습니다. 자정에 자동 리셋됩니다.` },
      ]);
      setInput("");
      return;
    }
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/stocks/chat`, {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ context, messages: next }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? `HTTP ${resp.status}`);
      setMessages([...next, { role: "assistant", content: data.reply ?? "(응답 없음)" }]);
    } catch (e: any) {
      setMessages([
        ...next,
        { role: "assistant", content: `⚠️ 응답 실패: ${e?.message ?? "네트워크 오류"}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kbWrap}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.background,
              paddingBottom: insets.bottom + 8,
              borderColor: c.cardBorder,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: c.text }]}>
                {context.name ?? context.ticker}에 대해 묻기
              </Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Claude Haiku · 오늘 {quota.remaining}/{quota.limit}건 남음
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                  아래 예시를 누르거나 직접 질문해 보세요.
                </Text>
                <View style={styles.suggestRow}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        { backgroundColor: c.card, borderColor: c.cardBorder },
                      ]}
                      onPress={() => send(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: c.text }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    m.role === "user"
                      ? [styles.userBubble, { backgroundColor: c.aiAccent }]
                      : [styles.aiBubble, { backgroundColor: c.card, borderColor: c.cardBorder }],
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: m.role === "user" ? "#fff" : c.text },
                    ]}
                  >
                    {m.content}
                  </Text>
                </View>
              ))
            )}
            {loading && (
              <View style={[styles.bubble, styles.aiBubble, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                <ActivityIndicator size="small" color={c.textSecondary} />
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputBar, { borderTopColor: c.cardBorder }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.backgroundSecondary,
                  color: c.text,
                  borderColor: c.cardBorder,
                },
              ]}
              placeholder={`${context.name ?? context.ticker}에 대해 질문...`}
              placeholderTextColor={c.textTertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              editable={!loading}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? c.aiAccent : c.backgroundTertiary, opacity: loading ? 0.5 : 1 },
              ]}
              disabled={loading || !input.trim()}
              onPress={() => send(input)}
            >
              <Ionicons name="arrow-up" size={18} color={input.trim() ? "#fff" : c.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  kbWrap:    { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet:     {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "85%",
    minHeight: 480,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(127,127,127,0.4)",
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub:   { fontSize: 11, marginTop: 2 },

  body:        { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  emptyWrap:   { paddingVertical: 24, alignItems: "center", gap: 16 },
  emptyText:   { fontSize: 13 },
  suggestRow:  { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  chip:        {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText:    { fontSize: 13, fontFamily: "Inter_500Medium" },

  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble:  { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble:    {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText:  { fontSize: 14, lineHeight: 20 },

  inputBar:    {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
