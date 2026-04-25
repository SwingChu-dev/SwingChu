import { Platform } from "react-native";

const FLY_API_URL = "https://swingchu-api.fly.dev";

function resolveApiBase(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const host = process.env.EXPO_PUBLIC_API_URL ?? FLY_API_URL;
  return `${host.replace(/\/$/, "")}/api`;
}

export const API_BASE = resolveApiBase();
