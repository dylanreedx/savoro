import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { MotiView } from "moti";
import { useDashboardStore } from "../../lib/stores/dashboard";
import { DashboardRings } from "../../components/dashboard/DashboardRings";
import { FoodLogList } from "../../components/dashboard/FoodLogList";
import { SkeletonRings, SkeletonCard } from "../../components/Skeleton";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardScreen() {
  const date = useDashboardStore((s) => s.date);
  const entries = useDashboardStore((s) => s.entries);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const error = useDashboardStore((s) => s.error);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);
  const setDate = useDashboardStore((s) => s.setDate);

  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) {
      const iso = selected.toISOString().slice(0, 10);
      setDate(iso);
    }
  };

  const isEmpty = entries.length === 0 && !isLoading;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: fonts.bold }]}>Dashboard</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowPicker(true)} style={styles.dateChip}>
            <Text style={[styles.dateText, { fontFamily: fonts.semibold }]}>
              {formatDateDisplay(date)}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/goal")} style={styles.goalButton}>
            <SymbolView name={{ ios: "target" }} tintColor={colors.stone[500]} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Date picker modal (iOS) */}
      {showPicker && Platform.OS === "ios" && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 200 }}
        >
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={new Date(date + "T00:00:00")}
              mode="date"
              display="inline"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
            <Pressable onPress={() => setShowPicker(false)} style={styles.pickerDone}>
              <Text style={[styles.pickerDoneText, { fontFamily: fonts.semibold }]}>Done</Text>
            </Pressable>
          </View>
        </MotiView>
      )}

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={new Date(date + "T00:00:00")}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="mt-2">
          {isLoading && entries.length === 0 ? (
            <SkeletonRings />
          ) : (
            <DashboardRings />
          )}
        </View>

        {/* Error state */}
        {error && !isLoading && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 200 }}
            style={styles.errorState}
          >
            <Text style={[styles.errorText, { fontFamily: fonts.medium }]}>
              {error}
            </Text>
            <Pressable onPress={() => fetchDashboard()} style={styles.retryButton}>
              <Text style={[styles.retryText, { fontFamily: fonts.semibold }]}>
                Retry
              </Text>
            </Pressable>
          </MotiView>
        )}

        {/* Skeleton food cards while loading */}
        {isLoading && entries.length === 0 && !error && (
          <View style={styles.skeletonCards}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}

        {isEmpty && !error ? (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 200 }}
            style={styles.emptyState}
          >
            <Text style={[styles.emptyText, { fontFamily: fonts.medium }]}>
              No food logged today.{"\n"}Head to Chat to start tracking!
            </Text>
          </MotiView>
        ) : (
          !isLoading && !error && <FoodLogList />
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 26,
    color: colors.stone[900],
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.stone[100],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  dateText: {
    fontSize: 14,
    color: colors.stone[600],
  },
  goalButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    padding: 6,
    backgroundColor: colors.stone[100],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  pickerContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: colors.stone[50],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  pickerDone: {
    alignItems: "center",
    paddingBottom: 12,
    paddingTop: 4,
  },
  pickerDoneText: {
    fontSize: 14,
    color: colors.stone[500],
  },
  emptyState: {
    marginTop: 48,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: colors.stone[400],
    lineHeight: 24,
  },
  errorState: {
    marginTop: 32,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.stone[500],
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: macroColors.calories,
  },
  retryText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  skeletonCards: {
    marginTop: 16,
    marginHorizontal: 16,
    gap: 12,
  },
});

