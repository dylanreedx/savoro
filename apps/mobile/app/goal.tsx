import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useGoalStore } from "../lib/stores/goal";
import { useDashboardStore } from "../lib/stores/dashboard";
import { colors, macroColors, glass, fonts } from "../constants/Colors";

type MacroField = {
  key: "calories" | "protein" | "carb" | "fat" | "fiber";
  label: string;
  unit: string;
  placeholder: string;
  color: string;
  required: boolean;
};

const FIELDS: MacroField[] = [
  { key: "calories", label: "Calories", unit: "kcal", placeholder: "2000", color: macroColors.calories, required: true },
  { key: "protein", label: "Protein", unit: "g", placeholder: "150", color: macroColors.protein, required: true },
  { key: "carb", label: "Carbs", unit: "g", placeholder: "250", color: macroColors.carb, required: true },
  { key: "fat", label: "Fat", unit: "g", placeholder: "65", color: macroColors.fat, required: true },
  { key: "fiber", label: "Fiber", unit: "g", placeholder: "30", color: colors.stone[400], required: false },
];

export default function GoalScreen() {
  const router = useRouter();
  const { goal, isLoading, isSaving, fetchGoal, saveGoal } = useGoalStore();
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);

  const [values, setValues] = useState<Record<string, string>>({
    calories: "", protein: "", carb: "", fat: "", fiber: "",
  });

  useEffect(() => { fetchGoal(); }, []);

  useEffect(() => {
    if (goal) {
      setValues({
        calories: goal.calories?.toString() ?? "",
        protein: goal.protein?.toString() ?? "",
        carb: goal.carb?.toString() ?? "",
        fat: goal.fat?.toString() ?? "",
        fiber: goal.fiber?.toString() ?? "",
      });
    }
  }, [goal]);

  const handleSave = async () => {
    const parsed: Record<string, number | undefined> = {};
    for (const field of FIELDS) {
      const v = values[field.key]?.trim();
      if (v) {
        const num = parseInt(v, 10);
        if (isNaN(num) || num < 0) return;
        parsed[field.key] = num;
      }
    }
    if (!parsed.calories && !parsed.protein && !parsed.carb && !parsed.fat) return;

    const ok = await saveGoal(parsed);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchDashboard();
      router.back();
    }
  };

  const hasValues = values.calories.trim() || values.protein.trim() || values.carb.trim() || values.fat.trim();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color={colors.stone[400]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.cancelText, { fontFamily: fonts.medium }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: fonts.bold }]}>Daily Goals</Text>
          <Pressable onPress={handleSave} disabled={!hasValues || isSaving}>
            <Text style={[styles.saveText, { fontFamily: fonts.semibold, color: hasValues && !isSaving ? colors.blush[500] : colors.stone[300] }]}>
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300 }}
          >
            <Text style={[styles.description, { fontFamily: fonts.regular }]}>
              Set your daily targets. These are used to track progress on your dashboard and in chat summaries.
            </Text>
          </MotiView>

          {/* Macro inputs */}
          {FIELDS.map((field, i) => (
            <MotiView
              key={field.key}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 50 * (i + 1) }}
            >
              <View style={styles.fieldRow}>
                <View style={[styles.colorDot, { backgroundColor: field.color }]} />
                <Text style={[styles.fieldLabel, { fontFamily: fonts.medium }]}>
                  {field.label}
                  {!field.required && (
                    <Text style={[styles.optionalText, { fontFamily: fonts.regular }]}> (optional)</Text>
                  )}
                </Text>
                <TextInput
                  style={[styles.fieldInput, { fontFamily: fonts.semibold }]}
                  value={values[field.key]}
                  onChangeText={(text) =>
                    setValues((prev) => ({ ...prev, [field.key]: text.replace(/[^0-9]/g, "") }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.stone[300]}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />
                <Text style={[styles.unitText, { fontFamily: fonts.regular }]}>{field.unit}</Text>
              </View>
            </MotiView>
          ))}

          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 400, delay: 400 }}
          >
            <Text style={[styles.infoNote, { fontFamily: fonts.regular }]}>
              Updating your goals creates a new version.{"\n"}
              Previous goals are kept for historical tracking.
            </Text>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  cancelText: { fontSize: 16, color: colors.stone[500] },
  headerTitle: { fontSize: 18, color: colors.stone[900] },
  saveText: { fontSize: 16 },
  description: {
    marginBottom: 24,
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: colors.stone[400],
  },
  fieldRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.stone[100],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  fieldLabel: { flex: 1, fontSize: 16, color: colors.stone[700] },
  optionalText: { fontSize: 14, color: colors.stone[400] },
  fieldInput: { minWidth: 80, textAlign: "right", fontSize: 16, color: colors.stone[900] },
  unitText: { marginLeft: 4, width: 32, fontSize: 14, color: colors.stone[400] },
  infoNote: { marginTop: 16, textAlign: "center", fontSize: 12, lineHeight: 16, color: colors.stone[400] },
});
