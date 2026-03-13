import { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { colors, glass } from "../constants/Colors";

type Props = {
  width: number | string;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width, height, radius = 10, style }: Props) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: radius,
          backgroundColor: colors.stone[200],
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <Animated.View style={styles.card}>
      <Skeleton width="60%" height={14} radius={7} />
      <Skeleton width="35%" height={10} radius={5} style={{ marginTop: 8 }} />
      <Animated.View style={styles.pillRow}>
        <Skeleton width={56} height={36} radius={10} />
        <Skeleton width={56} height={36} radius={10} />
        <Skeleton width={56} height={36} radius={10} />
        <Skeleton width={56} height={36} radius={10} />
      </Animated.View>
      <Skeleton width="100%" height={40} radius={14} style={{ marginTop: 12 }} />
    </Animated.View>
  );
}

export function SkeletonRings() {
  return (
    <Animated.View style={styles.ringsRow}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={styles.ringSlot}>
          <Skeleton width={52} height={52} radius={26} />
          <Skeleton width={24} height={8} radius={4} style={{ marginTop: 6 }} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: glass.radius,
    backgroundColor: glass.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    padding: 16,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 16,
    borderRadius: glass.radius,
    backgroundColor: glass.bgSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  ringSlot: {
    alignItems: "center",
  },
});
