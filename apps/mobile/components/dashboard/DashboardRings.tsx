import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { useDashboardStore } from "../../lib/stores/dashboard";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";

type RingProps = {
  current: number;
  goal: number | null;
  label: string;
  color: string;
  unit?: string;
};

const SIZE = 72;
const STROKE_WIDTH = 6;

function Ring({ current, goal, label, color, unit }: RingProps) {
  const radius = (SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const currentDisplay = Math.round(current);
  const goalDisplay = goal ? Math.round(goal) : "---";

  return (
    <View style={styles.ringItem}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={colors.stone[200]} strokeWidth={STROKE_WIDTH} fill="none" />
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
          <Text style={[styles.ringCurrentValue, { fontFamily: fonts.bold }]}>
            {currentDisplay}{unit ?? ""}
          </Text>
        </View>
      </View>
      <Text style={[styles.ringLabel, { fontFamily: fonts.semibold }]}>{label}</Text>
      <Text style={[styles.ringGoalText, { fontFamily: fonts.medium }]}>
        {currentDisplay} / {goalDisplay}
      </Text>
    </View>
  );
}

export function DashboardRings() {
  const totals = useDashboardStore((s) => s.totals);
  const goals = useDashboardStore((s) => s.goals);

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", damping: 14, stiffness: 200 }}
    >
      <BlurView
        intensity={glass.blur}
        tint={glass.tint}
        style={styles.glassSurface}
      >
        <View style={styles.glassInner} className="flex-row items-center justify-around px-4 py-4">
          <Ring current={totals.calories} goal={goals.calories} label="Cal" color={macroColors.calories} />
          <Ring current={totals.protein} goal={goals.protein} label="Protein" color={macroColors.protein} unit="g" />
          <Ring current={totals.carb} goal={goals.carb} label="Carbs" color={macroColors.carb} unit="g" />
          <Ring current={totals.fat} goal={goals.fat} label="Fat" color={macroColors.fat} unit="g" />
        </View>
      </BlurView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  glassSurface: {
    marginHorizontal: 16,
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  glassInner: {
    backgroundColor: glass.bgSubtle,
  },
  ringItem: {
    alignItems: "center",
  },
  ringCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringCurrentValue: {
    fontSize: 14,
    color: colors.stone[800],
  },
  ringLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.stone[500],
  },
  ringGoalText: {
    fontSize: 10,
    color: colors.stone[400],
  },
});
