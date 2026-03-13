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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useGoalStore } from "../lib/stores/goal";
import { useDashboardStore } from "../lib/stores/dashboard";
import { colors } from "../constants/Colors";

type MacroField = {
  key: "calories" | "protein" | "carb" | "fat" | "fiber";
  label: string;
  unit: string;
  placeholder: string;
  color: string;
  required: boolean;
};

const FIELDS: MacroField[] = [
  { key: "calories", label: "Calories", unit: "kcal", placeholder: "2000", color: colors.blush[400], required: true },
  { key: "protein", label: "Protein", unit: "g", placeholder: "150", color: "#60A5FA", required: true },
  { key: "carb", label: "Carbs", unit: "g", placeholder: "250", color: "#FBBF24", required: true },
  { key: "fat", label: "Fat", unit: "g", placeholder: "65", color: "#A78BFA", required: true },
  { key: "fiber", label: "Fiber", unit: "g", placeholder: "30", color: colors.stone[400], required: false },
];

export default function GoalScreen() {
  const router = useRouter();
  const { goal, isLoading, isSaving, fetchGoal, saveGoal } = useGoalStore();
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);

  const [values, setValues] = useState<Record<string, string>>({
    calories: "",
    protein: "",
    carb: "",
    fat: "",
    fiber: "",
  });

  useEffect(() => {
    fetchGoal();
  }, []);

  // Populate fields when goal loads
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

  const hasValues =
    values.calories.trim() ||
    values.protein.trim() ||
    values.carb.trim() ||
    values.fat.trim();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator color={colors.stone[400]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-base font-medium text-stone-500">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-bold text-stone-900">Daily Goals</Text>
          <Pressable onPress={handleSave} disabled={!hasValues || isSaving}>
            <Text
              className="text-base font-semibold"
              style={{ color: hasValues && !isSaving ? colors.blush[500] : colors.stone[300] }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Description */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300 }}
          >
            <Text className="mb-6 mt-4 text-sm leading-5 text-stone-400">
              Set your daily targets. These are used to track progress on your
              dashboard and in chat summaries.
            </Text>
          </MotiView>

          {/* Macro inputs */}
          {FIELDS.map((field, i) => (
            <MotiView
              key={field.key}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: 50 * (i + 1) }}
            >
              <View
                className="mb-3 flex-row items-center rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: colors.stone[100] }}
              >
                {/* Color indicator */}
                <View
                  className="mr-3 h-3 w-3 rounded-full"
                  style={{ backgroundColor: field.color }}
                />

                {/* Label */}
                <Text className="flex-1 text-base font-medium text-stone-700">
                  {field.label}
                  {!field.required && (
                    <Text className="text-sm text-stone-400"> (optional)</Text>
                  )}
                </Text>

                {/* Input */}
                <TextInput
                  className="min-w-[80px] text-right text-base font-semibold text-stone-900"
                  value={values[field.key]}
                  onChangeText={(text) =>
                    setValues((prev) => ({ ...prev, [field.key]: text.replace(/[^0-9]/g, "") }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.stone[300]}
                  keyboardType="number-pad"
                  returnKeyType="next"
                />

                {/* Unit */}
                <Text className="ml-1 w-8 text-sm text-stone-400">{field.unit}</Text>
              </View>
            </MotiView>
          ))}

          {/* Info note */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 400, delay: 400 }}
          >
            <Text className="mt-4 text-center text-xs leading-4 text-stone-400">
              Updating your goals creates a new version.{"\n"}
              Previous goals are kept for historical tracking.
            </Text>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
