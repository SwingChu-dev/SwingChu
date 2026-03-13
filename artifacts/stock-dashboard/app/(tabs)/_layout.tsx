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
      <Tabs.Screen
        name="index"
        options={{
          title: "관심종목",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "star.fill" : "star"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name={focused ? "star" : "star-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: "세력감지",
          tabBarIcon: ({ color, focused }) => (
            <View>
              {isIOS ? (
                <SymbolView
                  name={focused ? "eye.fill" : "eye"}
                  tintColor={color}
                  size={24}
                />
              ) : (
                <Ionicons name={focused ? "eye" : "eye-outline"} size={22} color={color} />
              )}
              <TabBadge count={newCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "분석",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "chart.bar.fill" : "chart.bar"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: "전략",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView
                name={focused ? "shield.fill" : "shield"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Ionicons name={focused ? "shield" : "shield-outline"} size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
