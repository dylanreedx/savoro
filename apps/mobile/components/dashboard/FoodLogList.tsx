import { useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useDashboardStore, LogEntry } from "../../lib/stores/dashboard";
import { colors, macroColors, macroBgColors, glass, fonts } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Meal ordering & grouping
// ---------------------------------------------------------------------------
const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;

function groupByMeal(entries: LogEntry[]) {
  const groups: Record<string, LogEntry[]> = {};
  for (const entry of entries) {
    const meal = entry.meal?.toLowerCase() ?? "snack";
    if (!groups[meal]) groups[meal] = [];
    groups[meal].push(entry);
  }

  return MEAL_ORDER.filter((m) => groups[m]?.length).map((meal) => ({
    meal,
    entries: groups[meal],
    totalCalories: groups[meal].reduce((sum, e) => sum + e.calories, 0),
  }));
}

// ---------------------------------------------------------------------------
// Macro pill
// ---------------------------------------------------------------------------
const PILL_COLORS: Record<string, { color: string; bg: string }> = {
  Cal: { color: macroColors.calories, bg: macroBgColors.calories },
  P: { color: macroColors.protein, bg: macroBgColors.protein },
  C: { color: macroColors.carb, bg: macroBgColors.carb },
  F: { color: macroColors.fat, bg: macroBgColors.fat },
};

function MacroPill({ label, value }: { label: string; value: number }) {
  const c = PILL_COLORS[label] ?? { color: colors.stone[500], bg: colors.stone[100] };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { fontFamily: fonts.medium, color: c.color }]}>
        {label} {Math.round(value)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Delete action
// ---------------------------------------------------------------------------
function renderRightActions(
  _progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>,
) {
  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0.5],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.deleteContainer}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.deleteButton}>
          <Text style={[styles.deleteText, { fontFamily: fonts.bold }]}>Delete</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------
function EntryRow({ entry, index }: { entry: LogEntry; index: number }) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    useDashboardStore.getState().deleteEntry(entry.id);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 200, delay: index * 60 }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleDelete}
        overshootRight={false}
      >
        <View style={styles.entryRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryName, { fontFamily: fonts.semibold }]} numberOfLines={1}>
              {entry.foodName}
            </Text>
            <Text style={[styles.entryServing, { fontFamily: fonts.regular }]} numberOfLines={1}>
              {entry.servingDescription}
              {entry.quantity > 1 ? ` x${entry.quantity}` : ""}
            </Text>
            <View style={styles.pillRow}>
              <MacroPill label="Cal" value={entry.calories} />
              <MacroPill label="P" value={entry.protein} />
              <MacroPill label="C" value={entry.carb} />
              <MacroPill label="F" value={entry.fat} />
            </View>
          </View>
        </View>
      </Swipeable>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ meal, totalCalories }: { meal: string; totalCalories: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>
        {meal.charAt(0).toUpperCase() + meal.slice(1)}
      </Text>
      <Text style={[styles.sectionCal, { fontFamily: fonts.medium }]}>
        {Math.round(totalCalories)} cal
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FoodLogList
// ---------------------------------------------------------------------------
export function FoodLogList() {
  const entries = useDashboardStore((s) => s.entries);
  const groups = groupByMeal(entries);

  if (groups.length === 0) return null;

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.meal}>
          <SectionHeader meal={group.meal} totalCalories={group.totalCalories} />
          <View style={styles.groupCard}>
            {group.entries.map((entry, i) => (
              <View key={entry.id}>
                {i > 0 && <View style={styles.divider} />}
                <EntryRow entry={entry} index={i} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.stone[700],
  },
  sectionCal: {
    fontSize: 12,
    color: colors.stone[400],
  },
  groupCard: {
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: glass.radius,
    backgroundColor: glass.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  entryName: {
    fontSize: 14,
    color: colors.stone[800],
  },
  entryServing: {
    marginTop: 2,
    fontSize: 12,
    color: colors.stone[400],
  },
  pillRow: {
    flexDirection: "row",
    marginTop: 6,
    gap: 6,
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 10,
  },
  divider: {
    marginHorizontal: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.stone[200],
  },
  deleteContainer: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    borderRadius: 12,
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
});
