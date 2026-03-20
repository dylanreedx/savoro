import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useChatStore } from "../../lib/stores/chat";
import { colors, macroColors, glass, fonts } from "../../constants/Colors";

type DailySnapshotProps = {
  compact?: boolean;
  onExpand?: () => void;
};

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
  size: sizeProp,
}: {
  current: number;
  goal: number | null;
  color: string;
  size?: number;
}) {
  const size = sizeProp ?? 42;
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.stone[200]} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}

export function DailySnapshot({ compact = false, onExpand }: DailySnapshotProps = {}) {
  const macros = useChatStore((s) => s.macros);
  const goals = useChatStore((s) => s.goals);
  const favorites = useChatStore((s) => s.favorites);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const hasGoals = goals.calories !== null;
  const hasAnyData = macros.calories > 0;

  const macroEntries = [
    { current: macros.calories, goal: goals.calories, color: macroColors.calories, label: "Cal", suffix: "" },
    { current: macros.protein, goal: goals.protein, color: macroColors.protein, label: "Protein", suffix: "g" },
    { current: macros.carb, goal: goals.carb, color: macroColors.carb, label: "Carbs", suffix: "g" },
    { current: macros.fat, goal: goals.fat, color: macroColors.fat, label: "Fat", suffix: "g" },
  ];

  // --- Compact mode: horizontal row of 4 small rings + expand chevron ---
  if (compact) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        style={{ marginHorizontal: 16 }}
      >
        <BlurView
          intensity={glass.blur}
          tint={glass.tint}
          style={styles.glassSurface}
        >
          <View style={[styles.glassInner, styles.compactRow]}>
            {hasGoals ? (
              macroEntries.map((m) => (
                <View key={m.label} style={styles.compactRingItem}>
                  <MiniRing current={m.current} goal={m.goal} color={m.color} size={32} />
                  <Text style={[styles.compactRingValue, { fontFamily: fonts.semibold }]}>
                    {Math.round(m.current)}{m.suffix}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.compactNoGoals, { fontFamily: fonts.regular }]}>
                No goals set
              </Text>
            )}
            {onExpand && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onExpand();
                }}
                style={styles.expandButton}
                hitSlop={12}
              >
                <Text style={styles.expandChevron}>{"\u25BC"}</Text>
              </Pressable>
            )}
          </View>
        </BlurView>
      </MotiView>
    );
  }

  // --- Full mode ---
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 150 }}
      style={{ marginHorizontal: 24, marginTop: 32 }}
    >
      <BlurView
        intensity={glass.blur}
        tint={glass.tint}
        style={styles.glassSurface}
      >
        <View style={styles.glassInner}>
          <View style={styles.content}>
            <Text style={[styles.greeting, { fontFamily: fonts.bold }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: fonts.regular }]}>
              {hasAnyData
                ? "Here\u2019s your progress today"
                : "Tell me what you\u2019ve eaten to start tracking"}
            </Text>

            {hasGoals ? (
              <View style={styles.ringsRow}>
                {macroEntries.map((m) => (
                  <View key={m.label} style={styles.ringItem}>
                    <MiniRing current={m.current} goal={m.goal} color={m.color} />
                    <Text style={[styles.ringValue, { fontFamily: fonts.semibold }]}>
                      {Math.round(m.current)}{m.suffix}
                    </Text>
                    <Text style={[styles.ringLabel, { fontFamily: fonts.medium }]}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noGoals}>
                <Text style={[styles.noGoalsText, { fontFamily: fonts.regular }]}>
                  Set your macro goals in the dashboard to see progress rings
                </Text>
              </View>
            )}

            {/* Quick-log favorites */}
            {favorites.length > 0 && (
              <View style={styles.favoritesContainer}>
                <Text style={[styles.favoritesLabel, { fontFamily: fonts.medium }]}>
                  QUICK LOG
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {favorites.map((f) => (
                    <Pressable
                      key={f.foodId}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        sendMessage(f.name);
                      }}
                      style={styles.chip}
                    >
                      <Text style={[styles.chipText, { fontFamily: fonts.medium }]}>
                        {f.name}
                        {f.calories != null && (
                          <Text style={{ color: colors.stone[400] }}>
                            {" "}{Math.round(f.calories)}
                          </Text>
                        )}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </BlurView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  glassSurface: {
    borderRadius: glass.radiusLg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  glassInner: {
    backgroundColor: glass.bgSubtle,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  greeting: {
    fontSize: 26,
    color: colors.stone[800],
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.stone[400],
  },
  ringsRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  ringItem: {
    alignItems: "center",
  },
  ringValue: {
    marginTop: 6,
    fontSize: 12,
    color: colors.stone[700],
  },
  ringLabel: {
    fontSize: 10,
    color: colors.stone[400],
  },
  noGoals: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: "rgba(250,250,249,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noGoalsText: {
    textAlign: "center",
    fontSize: 14,
    color: colors.stone[400],
  },
  favoritesContainer: {
    marginTop: 20,
  },
  favoritesLabel: {
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.stone[400],
  },
  chip: {
    borderRadius: 20,
    backgroundColor: "rgba(245,243,240,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  chipText: {
    fontSize: 14,
    color: colors.stone[700],
  },
  // Compact variant styles
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  compactRingItem: {
    alignItems: "center",
    gap: 2,
  },
  compactRingValue: {
    fontSize: 10,
    color: colors.stone[700],
  },
  compactNoGoals: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: colors.stone[400],
  },
  expandButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  expandChevron: {
    fontSize: 10,
    color: colors.stone[400],
  },
});
