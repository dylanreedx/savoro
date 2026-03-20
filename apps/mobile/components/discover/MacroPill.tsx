import { View, Text, StyleSheet } from "react-native";
import { colors, macroColors, macroBgColors, fonts } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Macro pill — reusable colored badge for macro values
// ---------------------------------------------------------------------------
type MacroKey = "cal" | "protein" | "carbs" | "fat";

const LABEL_MAP: Record<MacroKey, string> = {
  cal: " cal",
  protein: "g P",
  carbs: "g C",
  fat: "g F",
};

const COLOR_MAP: Record<MacroKey, { fg: string; bg: string }> = {
  cal: { fg: macroColors.calories, bg: macroBgColors.calories },
  protein: { fg: macroColors.protein, bg: macroBgColors.protein },
  carbs: { fg: macroColors.carb, bg: macroBgColors.carb },
  fat: { fg: macroColors.fat, bg: macroBgColors.fat },
};

interface MacroPillProps {
  macro: MacroKey;
  value: number;
}

export function MacroPill({ macro, value }: MacroPillProps) {
  const { fg, bg } = COLOR_MAP[macro];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { fontFamily: fonts.semibold, color: fg }]}>
        {Math.round(value)}{LABEL_MAP[macro]}
      </Text>
    </View>
  );
}

// Also export a row helper that renders all four macros
export function MacroPillRow({ macros }: { macros: { cal: number; protein: number; carbs: number; fat: number } }) {
  return (
    <View style={styles.row}>
      <MacroPill macro="cal" value={macros.cal} />
      <MacroPill macro="protein" value={macros.protein} />
      <MacroPill macro="carbs" value={macros.carbs} />
      <MacroPill macro="fat" value={macros.fat} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
});
