import { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import Svg, { Circle } from "react-native-svg";
import { colors, macroColors, macroBgColors, glass, fonts } from "../../constants/Colors";
import { useChatStore, type UiComponent } from "../../lib/stores/chat";
import { useNetworkStore } from "../../lib/stores/network";
import { api, ApiError } from "../../lib/api";

// ---------------------------------------------------------------------------
// Component Map
// ---------------------------------------------------------------------------
const COMPONENT_MAP: Record<string, React.FC<Record<string, unknown>>> = {
  food_card: FoodCard as React.FC<Record<string, unknown>>,
  macro_summary: MacroSummary as React.FC<Record<string, unknown>>,
  confirm_button: ConfirmButton as React.FC<Record<string, unknown>>,
  food_list: FoodList as React.FC<Record<string, unknown>>,
  quick_log_chips: QuickLogChips as React.FC<Record<string, unknown>>,
  daily_snapshot: DailySnapshotUI as React.FC<Record<string, unknown>>,
  recipe_card: RecipeCard as React.FC<Record<string, unknown>>,
};

export function GenerativeUIRenderer({ components }: { components: UiComponent[] }) {
  return (
    <View className="gap-2">
      {components.map((comp, i) => {
        const Component = COMPONENT_MAP[comp.type];
        if (!Component) return null;
        return (
          <MotiView
            key={`${comp.type}-${i}`}
            from={{ opacity: 0, translateY: 10, scale: 0.97 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 200, delay: i * 100 }}
          >
            <Component {...comp.props} />
          </MotiView>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Glass surface wrapper
// ---------------------------------------------------------------------------
function GlassSurface({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <BlurView
      intensity={glass.blur}
      tint={glass.tint}
      style={[styles.glassSurface, style]}
    >
      <View style={styles.glassInner}>{children}</View>
    </BlurView>
  );
}

// ---------------------------------------------------------------------------
// FoodCard — single food with macros, serving picker, and confirm button
// ---------------------------------------------------------------------------
type ServingOption = {
  id: string;
  description: string;
  calories?: number | null;
  protein?: number | null;
  carb?: number | null;
  fat?: number | null;
};

type FoodCardProps = {
  foodId: string;
  name: string;
  brandName?: string | null;
  servingId: string;
  servingDescription?: string | null;
  calories?: number | null;
  protein?: number | null;
  carb?: number | null;
  fat?: number | null;
  quantity?: number;
};

function FoodCard(props: FoodCardProps) {
  const { name, brandName, foodId } = props;
  const [qty, setQty] = useState(props.quantity ?? 1);
  const [logged, setLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [servings, setServings] = useState<ServingOption[]>([]);
  const [selectedServing, setSelectedServing] = useState<ServingOption>({
    id: props.servingId,
    description: props.servingDescription ?? "1 serving",
    calories: props.calories,
    protein: props.protein,
    carb: props.carb,
    fat: props.fat,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ servings: ServingOption[] }>(`/food/${foodId}/servings`)
      .then((data) => {
        if (!cancelled && data.servings.length > 1) {
          setServings(data.servings);
          const match = data.servings.find((s) => s.id === props.servingId);
          if (match) setSelectedServing(match);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [foodId, props.servingId]);

  const scaledCal = selectedServing.calories != null ? selectedServing.calories * qty : null;
  const scaledP = selectedServing.protein != null ? selectedServing.protein * qty : null;
  const scaledC = selectedServing.carb != null ? selectedServing.carb * qty : null;
  const scaledF = selectedServing.fat != null ? selectedServing.fat * qty : null;

  const [logError, setLogError] = useState<string | null>(null);

  const handleLog = useCallback(async () => {
    if (logging || logged) return;
    setLogging(true);
    setLogError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const meal = inferMeal();
    const { isConnected } = useNetworkStore.getState();

    // Queue for later if offline
    if (!isConnected) {
      useNetworkStore.getState().enqueue({
        foodId,
        servingId: selectedServing.id,
        quantity: qty,
        meal,
      });
      setLogged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogging(false);
      return;
    }

    try {
      await api("/log", {
        method: "POST",
        body: { foodId, servingId: selectedServing.id, quantity: qty, meal },
      });
      setLogged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useChatStore.getState().fetchMacros();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to log. Tap to retry.";
      setLogError(msg);
    } finally {
      setLogging(false);
    }
  }, [foodId, selectedServing.id, qty, logging, logged]);

  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setDismissed(true), 1800);
    return () => clearTimeout(timer);
  }, [logged]);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <MotiView
        from={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
      >
        <GlassSurface>
          <View className="px-4 py-3.5">
            <Text style={[styles.foodName, { fontFamily: fonts.semibold }]} numberOfLines={1}>
              {name}
            </Text>
            {brandName ? (
              <Text style={[styles.brandName, { fontFamily: fonts.regular }]}>
                {brandName}
              </Text>
            ) : null}

            {/* Serving picker */}
            <Pressable
              onPress={() => {
                if (servings.length > 1 && !logged) {
                  setPickerOpen((o) => !o);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              className="mt-2 flex-row items-center"
            >
              <Text style={[styles.servingText, { fontFamily: fonts.medium }]}>
                {selectedServing.description}
              </Text>
              {servings.length > 1 && !logged ? (
                <Text className="ml-1 text-[10px] text-stone-400">
                  {pickerOpen ? "\u25B2" : "\u25BC"}
                </Text>
              ) : null}
            </Pressable>

            {/* Serving dropdown */}
            <AnimatePresence>
              {pickerOpen && servings.length > 1 ? (
                <MotiView
                  from={{ opacity: 0, translateY: -4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -4 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  <ScrollView
                    className="mt-1.5 max-h-28"
                    style={styles.servingDropdown}
                    showsVerticalScrollIndicator={false}
                  >
                    {servings.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          setSelectedServing(s);
                          setPickerOpen(false);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.servingOption,
                          s.id === selectedServing.id && styles.servingOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.servingOptionText,
                            { fontFamily: s.id === selectedServing.id ? fonts.semibold : fonts.regular },
                            s.id === selectedServing.id && { color: macroColors.calories },
                          ]}
                        >
                          {s.description}
                          {s.calories != null ? ` \u00B7 ${Math.round(s.calories)} cal` : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </MotiView>
              ) : null}
            </AnimatePresence>

            {/* Quantity stepper */}
            <View className="mt-3 flex-row items-center justify-center gap-5">
              <Pressable
                onPress={() => { if (qty > 0.5) { setQty(q => Math.round((q - 0.5) * 10) / 10); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                style={styles.stepperButton}
              >
                <Text style={[styles.stepperText, { fontFamily: fonts.bold }]}>{"\u2212"}</Text>
              </Pressable>
              <Text style={[styles.qtyText, { fontFamily: fonts.semibold }]}>
                {qty}
              </Text>
              <Pressable
                onPress={() => { setQty(q => Math.round((q + 0.5) * 10) / 10); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.stepperButton}
              >
                <Text style={[styles.stepperText, { fontFamily: fonts.bold }]}>+</Text>
              </Pressable>
            </View>

            {/* Macro pills */}
            <View className="mt-3.5 flex-row justify-between">
              <MacroPill label="Cal" value={scaledCal} color={macroColors.calories} bg={macroBgColors.calories} />
              <MacroPill label="P" value={scaledP} color={macroColors.protein} bg={macroBgColors.protein} suffix="g" />
              <MacroPill label="C" value={scaledC} color={macroColors.carb} bg={macroBgColors.carb} suffix="g" />
              <MacroPill label="F" value={scaledF} color={macroColors.fat} bg={macroBgColors.fat} suffix="g" />
            </View>

            {/* Error message */}
            {logError && (
              <Text style={[styles.logErrorText, { fontFamily: fonts.medium }]}>
                {logError}
              </Text>
            )}

            {/* Log / Logged button */}
            <AnimatePresence>
              {logged ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                  style={styles.loggedButton}
                >
                  <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>
                    Logged!
                  </Text>
                </MotiView>
              ) : (
                <Pressable
                  onPress={handleLog}
                  disabled={logging}
                  style={[styles.logButton, logging && styles.logButtonDisabled]}
                >
                  <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>
                    {logging ? "Logging..." : `Log ${qty > 1 ? `${qty}x` : ""}`}
                  </Text>
                </Pressable>
              )}
            </AnimatePresence>
          </View>
        </GlassSurface>
      </MotiView>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// FoodList — search results
// ---------------------------------------------------------------------------
type FoodListItem = {
  foodId: string;
  name: string;
  brandName?: string | null;
  servingId?: string | null;
  servingDescription?: string | null;
  calories?: number | null;
  protein?: number | null;
  carb?: number | null;
  fat?: number | null;
};

function FoodList({ foods }: { foods: FoodListItem[] }) {
  return (
    <View className="gap-2">
      {foods.map((f) => (
        <FoodCard
          key={f.foodId}
          foodId={f.foodId}
          name={f.name}
          brandName={f.brandName}
          servingId={f.servingId ?? ""}
          servingDescription={f.servingDescription}
          calories={f.calories}
          protein={f.protein}
          carb={f.carb}
          fat={f.fat}
          quantity={1}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// RecipeCard — recipe with per-serving macros and log button
// ---------------------------------------------------------------------------
type RecipeCardProps = {
  recipeId: string;
  title: string;
  slug?: string;
  servings?: number;
  prepTime?: number | null;
  cookTime?: number | null;
  calories?: number | null;
  protein?: number | null;
  carb?: number | null;
  fat?: number | null;
};

function RecipeCard(props: RecipeCardProps) {
  const { recipeId, title, servings, prepTime, cookTime } = props;
  const [qty, setQty] = useState(1);
  const [logged, setLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const scaledCal = props.calories != null ? props.calories * qty : null;
  const scaledP = props.protein != null ? props.protein * qty : null;
  const scaledC = props.carb != null ? props.carb * qty : null;
  const scaledF = props.fat != null ? props.fat * qty : null;

  const handleLog = useCallback(async () => {
    if (logging || logged) return;
    setLogging(true);
    setLogError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const meal = inferMeal();
    const { isConnected } = useNetworkStore.getState();

    if (!isConnected) {
      useNetworkStore.getState().enqueue({
        recipeId,
        quantity: qty,
        meal,
      });
      setLogged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogging(false);
      return;
    }

    try {
      await api("/log/recipe", {
        method: "POST",
        body: { recipeId, quantity: qty, meal },
      });
      setLogged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useChatStore.getState().fetchMacros();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to log. Tap to retry.";
      setLogError(msg);
    } finally {
      setLogging(false);
    }
  }, [recipeId, qty, logging, logged]);

  useEffect(() => {
    if (!logged) return;
    const timer = setTimeout(() => setDismissed(true), 1800);
    return () => clearTimeout(timer);
  }, [logged]);

  if (dismissed) return null;

  const timeInfo = [
    prepTime != null ? `${prepTime}m prep` : null,
    cookTime != null ? `${cookTime}m cook` : null,
  ].filter(Boolean).join(" · ");

  return (
    <AnimatePresence>
      <MotiView
        from={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
      >
        <GlassSurface>
          <View className="px-4 py-3.5">
            <Text style={[styles.foodName, { fontFamily: fonts.semibold }]} numberOfLines={1}>
              {title}
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              {servings != null ? (
                <Text style={[styles.recipeMetaText, { fontFamily: fonts.medium }]}>
                  {servings} serving{servings !== 1 ? "s" : ""}
                </Text>
              ) : null}
              {timeInfo ? (
                <Text style={[styles.recipeMetaText, { fontFamily: fonts.medium }]}>
                  {timeInfo}
                </Text>
              ) : null}
            </View>

            {/* Quantity stepper */}
            <View className="mt-3 flex-row items-center justify-center gap-5">
              <Pressable
                onPress={() => { if (qty > 0.5) { setQty(q => Math.round((q - 0.5) * 10) / 10); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                style={styles.stepperButton}
              >
                <Text style={[styles.stepperText, { fontFamily: fonts.bold }]}>{"\u2212"}</Text>
              </Pressable>
              <Text style={[styles.qtyText, { fontFamily: fonts.semibold }]}>
                {qty}
              </Text>
              <Pressable
                onPress={() => { setQty(q => Math.round((q + 0.5) * 10) / 10); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.stepperButton}
              >
                <Text style={[styles.stepperText, { fontFamily: fonts.bold }]}>+</Text>
              </Pressable>
            </View>

            {/* Macro pills */}
            <View className="mt-3.5 flex-row justify-between">
              <MacroPill label="Cal" value={scaledCal} color={macroColors.calories} bg={macroBgColors.calories} />
              <MacroPill label="P" value={scaledP} color={macroColors.protein} bg={macroBgColors.protein} suffix="g" />
              <MacroPill label="C" value={scaledC} color={macroColors.carb} bg={macroBgColors.carb} suffix="g" />
              <MacroPill label="F" value={scaledF} color={macroColors.fat} bg={macroBgColors.fat} suffix="g" />
            </View>

            {logError && (
              <Text style={[styles.logErrorText, { fontFamily: fonts.medium }]}>
                {logError}
              </Text>
            )}

            {/* Log / Logged button */}
            <AnimatePresence>
              {logged ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                  style={styles.loggedButton}
                >
                  <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>
                    Logged!
                  </Text>
                </MotiView>
              ) : (
                <Pressable
                  onPress={handleLog}
                  disabled={logging}
                  style={[styles.logButton, logging && styles.logButtonDisabled]}
                >
                  <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>
                    {logging ? "Logging..." : `Log ${qty > 1 ? `${qty}x ` : ""}${title}`}
                  </Text>
                </Pressable>
              )}
            </AnimatePresence>
          </View>
        </GlassSurface>
      </MotiView>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// MacroSummary — ring chart with daily progress
// ---------------------------------------------------------------------------
type MacroSummaryProps = {
  totals: { calories: number; protein: number; carb: number; fat: number };
  goals: { calories: number | null; protein: number | null; carb: number | null; fat: number | null } | null;
};

function MacroSummary({ totals, goals }: MacroSummaryProps) {
  return (
    <GlassSurface>
      <View className="flex-row items-center justify-around px-4 py-4">
        <MacroRingMini label="Cal" current={totals.calories} goal={goals?.calories ?? null} color={macroColors.calories} />
        <MacroRingMini label="Protein" current={totals.protein} goal={goals?.protein ?? null} color={macroColors.protein} suffix="g" />
        <MacroRingMini label="Carbs" current={totals.carb} goal={goals?.carb ?? null} color={macroColors.carb} suffix="g" />
        <MacroRingMini label="Fat" current={totals.fat} goal={goals?.fat ?? null} color={macroColors.fat} suffix="g" />
      </View>
    </GlassSurface>
  );
}

function MacroRingMini({
  label, current, goal, color, suffix = "",
}: {
  label: string; current: number; goal: number | null; color: string; suffix?: string;
}) {
  const size = 44;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.stone[200]} strokeWidth={strokeWidth} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
        </Svg>
      </View>
      <Text style={[styles.ringValue, { fontFamily: fonts.semibold }]}>{Math.round(current)}{suffix}</Text>
      <Text style={[styles.ringLabel, { fontFamily: fonts.medium }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// QuickLogChips
// ---------------------------------------------------------------------------
type QuickLogChipFood = { foodId: string; servingId?: string | null; name: string; calories?: number | null };

function QuickLogChips({ foods }: { foods: QuickLogChipFood[] }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  return (
    <View className="flex-row flex-wrap gap-2">
      {foods.map((f) => (
        <Pressable
          key={f.foodId}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sendMessage(f.name); }}
          style={styles.chip}
        >
          <Text style={[styles.chipText, { fontFamily: fonts.medium }]}>
            {f.name}
            {f.calories != null ? <Text style={{ color: colors.stone[400] }}> {Math.round(f.calories)}</Text> : null}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ConfirmButton
// ---------------------------------------------------------------------------
type ConfirmButtonProps = { action: string; label: string; foodId?: string; servingId?: string; quantity?: number; meal?: string };

function ConfirmButton({ label, foodId, servingId, quantity = 1, meal }: ConfirmButtonProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = useCallback(async () => {
    if (loading || confirmed || !foodId || !servingId) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const mealValue = meal ?? inferMeal();
    const { isConnected } = useNetworkStore.getState();

    if (!isConnected) {
      useNetworkStore.getState().enqueue({ foodId, servingId, quantity, meal: mealValue });
      setConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      return;
    }

    try {
      await api("/log", { method: "POST", body: { foodId, servingId, quantity, meal: mealValue } });
      setConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useChatStore.getState().fetchMacros();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to log. Tap to retry.";
      setError(msg);
    } finally { setLoading(false); }
  }, [foodId, servingId, quantity, meal, loading, confirmed]);

  return (
    <View>
      {error && (
        <Text style={[styles.logErrorText, { fontFamily: fonts.medium }]}>{error}</Text>
      )}
      <AnimatePresence>
        {confirmed ? (
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 15, stiffness: 200 }} style={styles.loggedButton}>
            <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>Done!</Text>
          </MotiView>
        ) : (
          <Pressable onPress={handlePress} disabled={loading} style={[styles.logButton, loading && styles.logButtonDisabled]}>
            <Text style={[styles.buttonText, { fontFamily: fonts.semibold }]}>{loading ? "Logging..." : label}</Text>
          </Pressable>
        )}
      </AnimatePresence>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DailySnapshotUI
// ---------------------------------------------------------------------------
function DailySnapshotUI(props: MacroSummaryProps) {
  return <MacroSummary {...props} />;
}

// ---------------------------------------------------------------------------
// MacroPill
// ---------------------------------------------------------------------------
function MacroPill({ label, value, color, bg, suffix = "" }: { label: string; value?: number | null; color: string; bg: string; suffix?: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: bg }]}>
      <Text style={[styles.macroPillValue, { fontFamily: fonts.semibold, color }]}>
        {value != null ? Math.round(value) : "\u2014"}{suffix}
      </Text>
      <Text style={[styles.macroPillLabel, { fontFamily: fonts.medium }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inferMeal(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  glassSurface: {
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  glassInner: {
    backgroundColor: glass.bgSubtle,
  },
  foodName: { fontSize: 15, color: colors.stone[800] },
  brandName: { marginTop: 2, fontSize: 12, color: colors.stone[400] },
  recipeMetaText: { fontSize: 12, color: colors.stone[400] },
  servingText: { fontSize: 12, color: colors.stone[500] },
  servingDropdown: { borderRadius: glass.radiusSm, backgroundColor: "rgba(245,243,240,0.8)" },
  servingOption: { paddingHorizontal: 12, paddingVertical: 8 },
  servingOptionActive: { backgroundColor: "rgba(255,245,245,0.6)" },
  servingOptionText: { fontSize: 12, color: colors.stone[600] },
  stepperButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.stone[200], alignItems: "center", justifyContent: "center" },
  stepperText: { fontSize: 16, color: colors.stone[600] },
  qtyText: { fontSize: 16, color: colors.stone[800], minWidth: 40, textAlign: "center" },
  logButton: { marginTop: 14, alignItems: "center", borderRadius: 14, paddingVertical: 11, backgroundColor: macroColors.calories },
  logButtonDisabled: { backgroundColor: colors.stone[300] },
  loggedButton: { marginTop: 14, alignItems: "center", borderRadius: 14, paddingVertical: 11, backgroundColor: "#34D399" },
  buttonText: { fontSize: 14, color: "#FFFFFF" },
  ringValue: { marginTop: 4, fontSize: 12, color: colors.stone[700] },
  ringLabel: { fontSize: 10, color: colors.stone[400] },
  chip: { borderRadius: 20, backgroundColor: "rgba(245,243,240,0.8)", paddingHorizontal: 14, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: glass.borderSubtle },
  chipText: { fontSize: 14, color: colors.stone[700] },
  macroPill: { alignItems: "center", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  macroPillValue: { fontSize: 13 },
  macroPillLabel: { fontSize: 10, color: colors.stone[400], marginTop: 1 },
  logErrorText: { marginTop: 8, fontSize: 12, color: macroColors.calories, textAlign: "center" },
});
