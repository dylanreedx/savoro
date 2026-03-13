import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
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
import { colors } from "../../constants/Colors";

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardScreen() {
  const date = useDashboardStore((s) => s.date);
  const entries = useDashboardStore((s) => s.entries);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);
  const setDate = useDashboardStore((s) => s.setDate);

  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const dismissPicker = () => setShowPicker(false);

  const isEmpty = entries.length === 0 && !isLoading;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
        <Text className="text-2xl font-bold text-stone-900">Dashboard</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowPicker(true)}
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.stone[100] }}
          >
            <Text className="text-sm font-semibold text-stone-600">
              {formatDateDisplay(date)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/goal")}
            className="items-center justify-center rounded-full p-1.5"
            style={{ backgroundColor: colors.stone[100] }}
          >
            <SymbolView
              name={{ ios: "target" }}
              tintColor={colors.stone[500]}
              size={20}
            />
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
          <View
            className="mx-4 mb-2 overflow-hidden rounded-2xl"
            style={{ backgroundColor: colors.stone[50] }}
          >
            <DateTimePicker
              value={new Date(date + "T00:00:00")}
              mode="date"
              display="inline"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
            <Pressable
              onPress={dismissPicker}
              className="items-center pb-3 pt-1"
            >
              <Text className="text-sm font-semibold text-stone-500">Done</Text>
            </Pressable>
          </View>
        </MotiView>
      )}

      {/* Date picker (Android) */}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Macro rings */}
        <View className="mt-2">
          <DashboardRings />
        </View>

        {/* Food log or empty state */}
        {isEmpty ? (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 200 }}
            style={{ marginTop: 48, alignItems: "center", paddingHorizontal: 32 }}
          >
            <Text className="text-center text-base font-medium text-stone-400">
              No food logged today.{"\n"}Head to Chat to start tracking!
            </Text>
          </MotiView>
        ) : (
          <FoodLogList />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
