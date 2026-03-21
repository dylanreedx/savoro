import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useChatStore } from "../../lib/stores/chat";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";
import { BarcodeScanner } from "./BarcodeScanner";

export function ChatInput() {
  const [text, setText] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
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
    setScannerOpen(true);
  };

  const handleScan = (barcode: string) => {
    setScannerOpen(false);
    sendMessage("Scanned barcode", [{ type: "barcode", value: barcode }]);
  };

  return (
    <>
      <BlurView
        intensity={glass.blurHeavy}
        tint={glass.tint}
        style={styles.blurBar}
      >
        <View style={styles.row}>
          <Pressable onPress={handleBarcode} style={styles.barcodeButton}>
            <SymbolView
              name={{ ios: "barcode.viewfinder" }}
              tintColor={colors.stone[400]}
              size={22}
            />
          </Pressable>

          <View style={styles.inputContainer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What did you eat?"
              placeholderTextColor={colors.stone[400]}
              multiline
              maxLength={500}
              testID="chat-input"
            style={[styles.textInput, { fontFamily: fonts.regular }]}
            />
          </View>

          <Pressable
            testID="send-button"
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, { opacity: canSend ? 1 : 0.35 }]}
          >
            <SymbolView
              name={{ ios: "arrow.up" }}
              tintColor="white"
              size={18}
            />
          </Pressable>
        </View>
      </BlurView>

      <BarcodeScanner
        visible={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blurBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: glass.borderSubtle,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  barcodeButton: {
    marginBottom: 6,
    borderRadius: 20,
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 22,
    backgroundColor: "rgba(245,243,240,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  textInput: {
    flex: 1,
    maxHeight: 96,
    fontSize: 16,
    color: colors.stone[900],
  },
  sendButton: {
    marginBottom: 6,
    borderRadius: 20,
    backgroundColor: macroColors.calories,
    padding: 10,
  },
});
