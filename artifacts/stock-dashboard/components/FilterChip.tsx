import React from "react";
import { TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

export default function FilterChip({ label, selected, onPress, color }: FilterChipProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const activeColor = color || c.tint;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected
          ? { backgroundColor: activeColor }
          : { backgroundColor: isDark ? "#2C2C2E" : "#EAECEF" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? "#FFFFFF" : c.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
