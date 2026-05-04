import { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { colors } from "../../constants/Colors";

type BarcodeScannerProps = {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ visible, onScan, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lastScanned = useRef<string | null>(null);

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    const { data } = result;
    if (data === lastScanned.current) return;

    lastScanned.current = data;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScan(data);
  };

  const handleClose = () => {
    setScanned(false);
    lastScanned.current = null;
    onClose();
  };

  if (!visible) return null;

  // Permission not yet determined
  if (!permission?.granted) {
    return (
      <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
        <View className="flex-1 items-center justify-center bg-stone-900 px-8">
          <SymbolView
            name={{ ios: "barcode.viewfinder" }}
            tintColor={colors.stone[300]}
            size={64}
          />
          <Text className="mt-6 text-center text-lg font-semibold text-stone-100">
            Camera Access Needed
          </Text>
          <Text className="mt-2 text-center text-sm text-stone-400">
            Savoro uses your camera to scan food barcodes and instantly look up nutrition info.
          </Text>
          <Pressable
            onPress={requestPermission}
            className="mt-8 rounded-xl bg-blush-400 px-8 py-3"
          >
            <Text className="text-sm font-semibold text-white">Allow Camera</Text>
          </Pressable>
          <Pressable onPress={handleClose} className="mt-4 px-8 py-3">
            <Text className="text-sm text-stone-400">Not Now</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
      <View className="flex-1 bg-black">
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Viewfinder overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Top dim */}
          <View className="flex-1 bg-black/50" />

          {/* Middle row: dim | clear | dim */}
          <View className="flex-row">
            <View className="flex-1 bg-black/50" />
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              style={styles.viewfinder}
            >
              {/* Corner marks */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </MotiView>
            <View className="flex-1 bg-black/50" />
          </View>

          {/* Bottom dim + hint */}
          <View className="flex-1 items-center bg-black/50 pt-8">
            <Text className="text-sm text-stone-300">
              Point at a barcode on any food package
            </Text>
          </View>
        </View>

        {/* Close button */}
        <View className="absolute left-0 right-0 top-16 items-center">
          <BlurView intensity={40} tint="dark" style={{ borderRadius: 999, overflow: "hidden" }}>
            <Pressable
              onPress={handleClose}
              className="flex-row items-center gap-1.5 px-4 py-2"
            >
              <SymbolView
                name={{ ios: "xmark" }}
                tintColor={colors.stone[200]}
                size={14}
              />
              <Text className="text-sm font-medium text-stone-200">Close</Text>
            </Pressable>
          </BlurView>
        </View>

        {/* Scanning indicator */}
        {scanned && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            className="absolute bottom-24 left-0 right-0 items-center"
          >
            <BlurView intensity={60} tint="dark" style={{ borderRadius: 12, overflow: "hidden" }}>
              <View className="flex-row items-center gap-2 px-5 py-3">
                <SymbolView
                  name={{ ios: "checkmark.circle.fill" }}
                  tintColor="#4ADE80"
                  size={18}
                />
                <Text className="text-sm font-medium text-stone-100">Barcode scanned</Text>
              </View>
            </BlurView>
          </MotiView>
        )}
      </View>
    </Modal>
  );
}

const VIEWFINDER_SIZE = 280;
const CORNER_SIZE = 32;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE * 0.6,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 12,
    borderColor: "white",
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 12,
    borderColor: "white",
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 12,
    borderColor: "white",
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 12,
    borderColor: "white",
  },
});
