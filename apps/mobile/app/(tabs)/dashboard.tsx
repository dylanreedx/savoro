import { View, Text } from "react-native";

export default function DashboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-stone-50">
      <Text className="text-xl font-semibold text-stone-900">Dashboard</Text>
      <Text className="mt-2 text-stone-400">Your daily overview</Text>
    </View>
  );
}
