import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { useChatStore } from "../../lib/stores/chat";
import { colors } from "../../constants/Colors";

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
    <View className="items-center">
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
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-xs font-semibold text-stone-800">
            {Math.round(current)}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-[10px] font-medium text-stone-400">
        {label}
      </Text>
    </View>
  );
}

export function MacroRing() {
  const macros = useChatStore((s) => s.macros);
  const goals = useChatStore((s) => s.goals);

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
    >
      <BlurView
        intensity={60}
        tint="light"
        style={{ marginHorizontal: 16, borderRadius: 16, overflow: "hidden" }}
      >
        <View className="flex-row items-center justify-around px-4 py-3">
          <Ring
            current={macros.calories}
            goal={goals.calories}
            label="Cal"
            color={colors.blush[400]}
          />
          <Ring
            current={macros.protein}
            goal={goals.protein}
            label="Protein"
            color="#60A5FA"
          />
          <Ring
            current={macros.carb}
            goal={goals.carb}
            label="Carbs"
            color="#FBBF24"
          />
          <Ring
            current={macros.fat}
            goal={goals.fat}
            label="Fat"
            color="#A78BFA"
          />
        </View>
      </BlurView>
    </MotiView>
  );
}
