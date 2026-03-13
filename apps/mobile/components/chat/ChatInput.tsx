import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useChatStore } from "../../lib/stores/chat";
import { colors } from "../../constants/Colors";

export function ChatInput() {
  const [text, setText] = useState("");
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isLoading = useChatStore((s) => s.isLoading);

  const canSend = text.trim().length > 0 && !isLoading;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setText("");
    sendMessage(trimmed);
  };

  const handleBarcode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Open barcode scanner modal
  };

  return (
    <BlurView
      intensity={80}
      tint="light"
      style={{ borderTopWidth: 1, borderTopColor: "rgba(231,229,224,0.5)" }}
    >
      <View className="flex-row items-end gap-2 px-4 pb-2 pt-2">
        <Pressable onPress={handleBarcode} className="mb-1.5 rounded-full p-2">
          <SymbolView
            name={{ ios: "barcode.viewfinder" }}
            tintColor={colors.stone[400]}
            size={22}
          />
        </Pressable>

        <View className="flex-1 flex-row items-end rounded-2xl bg-stone-100/80 px-4 py-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What did you eat?"
            placeholderTextColor={colors.stone[400]}
            multiline
            maxLength={500}
            className="max-h-24 flex-1 text-base text-stone-900"
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className="mb-1.5 rounded-full bg-blush-400 p-2.5"
          style={{ opacity: canSend ? 1 : 0.4 }}
        >
          <SymbolView
            name={{ ios: "arrow.up" }}
            tintColor="white"
            size={18}
          />
        </Pressable>
      </View>
    </BlurView>
  );
}
