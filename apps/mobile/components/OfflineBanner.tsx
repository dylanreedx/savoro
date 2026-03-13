import { View, Text, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { BlurView } from "expo-blur";
import { useNetworkStore } from "../lib/stores/network";
import { colors, glass, fonts } from "../constants/Colors";

export function OfflineBanner() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const queueCount = useNetworkStore((s) => s.queue.length);

  return (
    <AnimatePresence>
      {!isConnected ? (
        <MotiView
          from={{ opacity: 0, translateY: -40 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -40 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          style={styles.wrapper}
        >
          <BlurView
            intensity={glass.blurHeavy}
            tint={glass.tint}
            style={styles.blurContainer}
          >
            <View style={styles.inner}>
              <View style={styles.dot} />
              <Text style={[styles.text, { fontFamily: fonts.semibold }]}>
                You're offline
              </Text>
              {queueCount > 0 && (
                <Text style={[styles.subtext, { fontFamily: fonts.regular }]}>
                  {queueCount} item{queueCount !== 1 ? "s" : ""} queued
                </Text>
              )}
            </View>
          </BlurView>
        </MotiView>
      ) : null}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  blurContainer: {
    borderRadius: glass.radiusSm,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.5)",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.stone[400],
  },
  text: {
    fontSize: 13,
    color: colors.stone[700],
  },
  subtext: {
    fontSize: 12,
    color: colors.stone[400],
  },
});
