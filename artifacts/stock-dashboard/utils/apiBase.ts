import { Platform } from "react-native";

function resolveApiBase(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  return `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;
}

export const API_BASE = resolveApiBase();
