import { StatusBar } from "expo-status-bar";
import { View, Text } from "react-native";

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-stone-50">
      <Text className="text-xl font-semibold text-stone-900">Modal</Text>
      <StatusBar style="light" />
    </View>
  );
}
