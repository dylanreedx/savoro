import { View, Text } from "react-native";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import Svg, { Circle } from "react-native-svg";
import { useChatStore } from "../../lib/stores/chat";
import { colors } from "../../constants/Colors";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function MiniRing({
  current,
  goal,
  color,
}: {
  current: number;
  goal: number | null;
  color: string;
}) {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
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
    </View>
  );
}

export function DailySnapshot() {
  const macros = useChatStore((s) => s.macros);
  const goals = useChatStore((s) => s.goals);
  const hasGoals = goals.calories !== null;
  const hasAnyData = macros.calories > 0;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 150 }}
      style={{ marginHorizontal: 24, marginTop: 32 }}
    >
      <BlurView
        intensity={40}
        tint="light"
        style={{ borderRadius: 24, overflow: "hidden" }}
      >
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-stone-800">
            {getGreeting()}
          </Text>
          <Text className="mt-1 text-sm text-stone-400">
            {hasAnyData
              ? "Here's your progress today"
              : "Tell me what you've eaten to start tracking"}
          </Text>

          {hasGoals ? (
            <View className="mt-5 flex-row items-center justify-around">
              <View className="items-center">
                <MiniRing
                  current={macros.calories}
                  goal={goals.calories}
                  color={colors.blush[400]}
                />
                <Text className="mt-1.5 text-xs font-semibold text-stone-700">
                  {Math.round(macros.calories)}
                </Text>
                <Text className="text-[10px] text-stone-400">Cal</Text>
              </View>
              <View className="items-center">
                <MiniRing
                  current={macros.protein}
                  goal={goals.protein}
                  color="#60A5FA"
                />
                <Text className="mt-1.5 text-xs font-semibold text-stone-700">
                  {Math.round(macros.protein)}g
                </Text>
                <Text className="text-[10px] text-stone-400">Protein</Text>
              </View>
              <View className="items-center">
                <MiniRing
                  current={macros.carb}
                  goal={goals.carb}
                  color="#FBBF24"
                />
                <Text className="mt-1.5 text-xs font-semibold text-stone-700">
                  {Math.round(macros.carb)}g
                </Text>
                <Text className="text-[10px] text-stone-400">Carbs</Text>
              </View>
              <View className="items-center">
                <MiniRing
                  current={macros.fat}
                  goal={goals.fat}
                  color="#A78BFA"
                />
                <Text className="mt-1.5 text-xs font-semibold text-stone-700">
                  {Math.round(macros.fat)}g
                </Text>
                <Text className="text-[10px] text-stone-400">Fat</Text>
              </View>
            </View>
          ) : (
            <View className="mt-5 rounded-2xl bg-stone-50/50 px-4 py-3">
              <Text className="text-center text-sm text-stone-400">
                Set your macro goals in the dashboard to see progress rings
              </Text>
            </View>
          )}
        </View>
      </BlurView>
    </MotiView>
  );
}
