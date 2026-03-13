import { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { useChatStore } from "../../lib/stores/chat";
import { SkeletonRings } from "../Skeleton";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";

type RingProps = {
  current: number;
  goal: number | null;
  label: string;
  color: string;
  size?: number;
};

function Ring({ current, goal, label, color, size = 52 }: RingProps) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.ringContainer}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stone[200]}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={StyleSheet.absoluteFill} className="items-center justify-center">
          <Text style={[styles.ringValue, { fontFamily: fonts.semibold }]}>
            {Math.round(current)}
          </Text>
        </View>
      </View>
      <Text style={[styles.ringLabel, { fontFamily: fonts.medium }]}>
        {label}
      </Text>
    </View>
  );
}

export function MacroRing() {
  const macros = useChatStore((s) => s.macros);
  const goals = useChatStore((s) => s.goals);
  const isLoading = useChatStore((s) => s.isLoading);
  const isMacrosLoading = useChatStore((s) => s.isMacrosLoading);
  const isTimedOut = useChatStore((s) => s.isTimedOut);
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);
  const prevCalories = useRef(macros.calories);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (macros.calories !== prevCalories.current && prevCalories.current !== 0) {
      setBouncing(true);
      const timer = setTimeout(() => setBouncing(false), 300);
      return () => clearTimeout(timer);
    }
    prevCalories.current = macros.calories;
  }, [macros.calories]);

  // Show skeleton only on initial macro load (no data yet)
  if (isMacrosLoading && macros.calories === 0 && goals.calories === null) {
    return <SkeletonRings />;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0, scale: bouncing ? 1.04 : 1 }}
      transition={{ type: "spring", damping: 14, stiffness: 200 }}
    >
      <BlurView
        intensity={glass.blur}
        tint={glass.tint}
        style={styles.blurContainer}
      >
        <View style={styles.innerBg} className="flex-row items-center justify-around px-4 py-3">
          {/* Show shimmer overlay while agent is "thinking" */}
          {isLoading && (
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 0.7 }}
              transition={{
                type: "timing",
                duration: 800,
                loop: true,
              }}
              style={[StyleSheet.absoluteFill, styles.thinkingOverlay]}
            />
          )}

          <Ring current={macros.calories} goal={goals.calories} label="Cal" color={macroColors.calories} />
          <Ring current={macros.protein} goal={goals.protein} label="Protein" color={macroColors.protein} />
          <Ring current={macros.carb} goal={goals.carb} label="Carbs" color={macroColors.carb} />
          <Ring current={macros.fat} goal={goals.fat} label="Fat" color={macroColors.fat} />
        </View>

        {/* Timeout banner */}
        {isTimedOut && (
          <View style={styles.timeoutBanner}>
            <Text style={[styles.timeoutText, { fontFamily: fonts.medium }]}>
              Taking longer than expected...
            </Text>
            <Pressable onPress={retryLastMessage} style={styles.timeoutRetry}>
              <Text style={[styles.timeoutRetryText, { fontFamily: fonts.semibold }]}>
                Retry
              </Text>
            </Pressable>
          </View>
        )}
      </BlurView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    marginHorizontal: 16,
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  innerBg: {
    backgroundColor: glass.bgSubtle,
  },
  ringContainer: {
    alignItems: "center",
  },
  ringValue: {
    fontSize: 12,
    color: colors.stone[800],
  },
  ringLabel: {
    marginTop: 4,
    fontSize: 10,
    color: colors.stone[400],
  },
  thinkingOverlay: {
    backgroundColor: "rgba(255,255,255,0.25)",
    zIndex: 1,
  },
  timeoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(251,113,133,0.06)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(251,113,133,0.2)",
  },
  timeoutText: {
    fontSize: 12,
    color: colors.stone[500],
  },
  timeoutRetry: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: macroColors.calories,
  },
  timeoutRetryText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
});
