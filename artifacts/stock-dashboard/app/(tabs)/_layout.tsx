import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useSignals } from "@/context/SignalContext";
import { Text } from "react-native";

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={badge.wrap}>
      <Text style={badge.text}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#F04452",
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  text: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { newCount } = useSignals();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#1C1C1E" : "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      {/* ── 5개 주요 탭 ─────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "관심종목",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "star.fill" : "star"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "star" : "star-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "탐색",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "magnifyingglass.circle.fill" : "magnifyingglass.circle"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="scalping"
        options={{
          title: "단타레이더",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "bolt.fill" : "bolt"} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "flash" : "flash-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "포트폴리오",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "briefcase.fill" : "briefcase"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons
                name={focused ? "briefcase" : "briefcase-outline"}
                size={22}
                color={color}
              />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "더보기",
          tabBarIcon: ({ color, focused }) => (
            <View>
              {isIOS ? (
                <SymbolView
                  name={focused ? "ellipsis.circle.fill" : "ellipsis.circle"}
                  tintColor={color}
                  size={24}
                />
              ) : (
                <Ionicons
                  name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"}
                  size={22}
                  color={color}
                />
              )}
              {/* 세력감지 미확인 신호 배지 */}
              <TabBadge count={newCount} />
            </View>
          ),
        }}
      />

      {/* ── 더보기에서 접근하는 숨겨진 탭 (탭바에 표시 안 됨) ── */}
      <Tabs.Screen
        name="signals"
        options={{
          title: "세력감지",
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "분석",
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: "전략",
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
