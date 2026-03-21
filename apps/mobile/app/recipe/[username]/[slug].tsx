import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { publicApi, ApiError } from "../../../lib/api";
import { colors, macroColors, glass, fonts } from "../../../constants/Colors";

type Ingredient = {
  id: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  servingCalories: number | null;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbPerServing: number | null;
  fatPerServing: number | null;
  instructions: string | null;
  tags: string[] | null;
  forkCount: number;
};

type Creator = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type RecipePageData = {
  recipe: Recipe;
  creator: Creator;
  ingredients: Ingredient[];
};

function MacroChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center", minWidth: 56 }}>
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 15,
          color: colors.sand[900],
          tabularNums: true,
        }}
      >
        {Math.round(value)}
        {unit}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.sand[400] }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function RecipeDetailModal() {
  const { username, slug } = useLocalSearchParams<{ username: string; slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<RecipePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || !slug) return;

    publicApi<RecipePageData>(`/public/recipes/${username}/${slug}`)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.status === 404 ? "Recipe not found." : "Failed to load recipe.");
        } else {
          setError("Failed to load recipe.");
        }
      })
      .finally(() => setLoading(false));
  }, [username, slug]);

  function handleFork() {
    if (!data) return;
    router.push(`/(tabs)/discover`);
  }

  const APP_STORE_URL = "https://apps.apple.com/app/savoro/id0000000000";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.savoro.mobile";

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.sand[50] }}>
        <ActivityIndicator color={colors.sand[400]} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.sand[50] }}
      >
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.sand[500] }}>
          {error ?? "Recipe not found."}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.sand[700] }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { recipe: r, creator, ingredients } = data;
  const totalTime = (r.prepTime ?? 0) + (r.cookTime ?? 0);

  function formatTime(minutes: number | null): string {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  const instructionSteps = r.instructions
    ? r.instructions.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.sand[50] }}>
      {/* Close handle */}
      <SafeAreaView edges={["top"]}>
        <View style={{ alignItems: "center", paddingTop: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.sand[200] }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image header */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
        >
          <View
            style={{
              height: 220,
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: colors.blush[100],
            }}
          >
            {r.imageUrl ? (
              <Image source={{ uri: r.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.blush[50] }} />
            )}
            {/* Tags overlay */}
            {r.tags?.length ? (
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {r.tags.slice(0, 4).map((tag) => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.75)",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.sand[700] }}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </MotiView>

        {/* Title + Author */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 80 }}
          style={{ paddingHorizontal: 20, marginTop: 16 }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.sand[900], lineHeight: 30 }}>
            {r.title}
          </Text>
          {r.description ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.sand[500], marginTop: 6, lineHeight: 20 }}>
              {r.description}
            </Text>
          ) : null}

          {/* Author */}
          <Pressable
            onPress={() => router.push(`/(tabs)/discover`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}
          >
            {creator.avatarUrl ? (
              <Image
                source={{ uri: creator.avatarUrl }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.blush[200],
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.sand[100] }}>
                  {(creator.displayName || creator.username).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.sand[800] }}>
                {creator.displayName || creator.username}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.sand[400] }}>
                @{creator.username}
              </Text>
            </View>
          </Pressable>
        </MotiView>

        {/* Macro bar */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 400, delay: 150 }}
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 16,
            backgroundColor: colors.sand[100],
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center", minWidth: 64 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.sand[900] }}>
                {Math.round(r.caloriesPerServing ?? 0)}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.sand[400], textTransform: "uppercase", letterSpacing: 0.8 }}>
                cal
              </Text>
            </View>
            <View style={{ width: 1, height: 32, backgroundColor: colors.sand[200] }} />
            <MacroChip label="protein" value={r.proteinPerServing ?? 0} unit="g" color={macroColors.protein} />
            <MacroChip label="carbs" value={r.carbPerServing ?? 0} unit="g" color={macroColors.carb} />
            <MacroChip label="fat" value={r.fatPerServing ?? 0} unit="g" color={macroColors.fat} />
          </View>
          {/* Meta row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {totalTime > 0 && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.sand[50], borderWidth: 1, borderColor: colors.sand[200] }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.sand[500] }}>
                  {formatTime(totalTime)}
                </Text>
              </View>
            )}
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.sand[50], borderWidth: 1, borderColor: colors.sand[200] }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.sand[500] }}>
                {r.servings} serving{r.servings > 1 ? "s" : ""}
              </Text>
            </View>
            {r.forkCount > 0 && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.sand[50], borderWidth: 1, borderColor: colors.sand[200] }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.sand[500] }}>
                  {r.forkCount} fork{r.forkCount !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Ingredients */}
        <MotiView
          from={{ opacity: 0, translateX: -10 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "timing", duration: 400, delay: 200 }}
          style={{ paddingHorizontal: 20, marginTop: 24 }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.sand[900], marginBottom: 12 }}>
            Ingredients
          </Text>
          {ingredients.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.sand[400] }}>No ingredients listed.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {ingredients.map((ing) => (
                <View key={ing.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blush[300], marginTop: 7 }} />
                  <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.sand[700], flex: 1 }}>
                    {ing.quantity ? (
                      <Text style={{ fontFamily: fonts.semibold }}>{ing.quantity} </Text>
                    ) : null}
                    {ing.unit ? <Text style={{ color: colors.sand[400] }}>{ing.unit} </Text> : null}
                    {ing.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </MotiView>

        {/* Instructions */}
        {instructionSteps.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateX: 10 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 400, delay: 240 }}
            style={{ paddingHorizontal: 20, marginTop: 24 }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.sand[900], marginBottom: 12 }}>
              Instructions
            </Text>
            <View style={{ gap: 16 }}>
              {instructionSteps.map((step, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.sand[100],
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.sand[500] }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.sand[700], flex: 1, lineHeight: 22, paddingTop: 4 }}>
                    {step.replace(/^\d+\.\s*/, "")}
                  </Text>
                </View>
              ))}
            </View>
          </MotiView>
        )}

        {/* Fork CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 300 }}
          style={{ paddingHorizontal: 20, marginTop: 32 }}
        >
          <Pressable
            onPress={handleFork}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.sand[800] : colors.sand[900],
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
            })}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: "#fff" }}>
              Fork this recipe
            </Text>
          </Pressable>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.sand[400], textAlign: "center", marginTop: 10 }}>
            Save to your cookbook and customise macros
          </Text>
        </MotiView>
      </ScrollView>
    </View>
  );
}
