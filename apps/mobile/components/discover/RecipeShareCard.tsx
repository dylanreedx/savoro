import { View, Text, Image, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { MacroPillRow } from "./MacroPill";
import type { SocialRecipeShare, TrendingRecipe } from "../../lib/stores/discover";
import { colors, glass, fonts, springPresets } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Social recipe share card (vertical feed)
// ---------------------------------------------------------------------------
interface RecipeShareCardProps {
  share: SocialRecipeShare;
  index: number;
}

export function RecipeShareCard({ share, index }: RecipeShareCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ ...springPresets.gentle, delay: Math.min(index * 60, 300) }}
    >
      <BlurView intensity={glass.blur} tint={glass.tint} style={styles.glassSurface}>
        <View style={styles.cardInner}>
          {/* Avatar row */}
          <View style={styles.avatarRow}>
            <Image source={{ uri: share.sharedBy.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { fontFamily: fonts.semibold }]}>
                {share.sharedBy.name}
              </Text>
            </View>
            <Text style={[styles.time, { fontFamily: fonts.medium }]}>
              {relativeTime(share.sharedAt)}
            </Text>
          </View>

          {/* Recipe name */}
          <Text style={[styles.recipeName, { fontFamily: fonts.bold }]} numberOfLines={2}>
            {share.recipeName}
          </Text>

          {/* Macro pills */}
          <MacroPillRow macros={share.macros} />

          {/* Provenance */}
          <Text style={[styles.provenance, { fontFamily: fonts.regular }]} numberOfLines={1}>
            {share.provenance}
          </Text>
        </View>
      </BlurView>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Trending recipe card (horizontal scroll, with saved-count badge)
// ---------------------------------------------------------------------------
interface TrendingRecipeCardProps {
  recipe: TrendingRecipe;
  index: number;
}

export function TrendingRecipeCard({ recipe, index }: TrendingRecipeCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springPresets.gentle, delay: Math.min(index * 80, 240) }}
    >
      <BlurView intensity={glass.blur} tint={glass.tint} style={styles.trendingGlass}>
        <View style={styles.trendingInner}>
          {/* Recipe name */}
          <Text style={[styles.trendingName, { fontFamily: fonts.bold }]} numberOfLines={2}>
            {recipe.recipeName}
          </Text>

          {/* Macro pills */}
          <MacroPillRow macros={recipe.macros} />

          {/* Saved count badge */}
          <View style={styles.savedBadge}>
            <Text style={[styles.savedText, { fontFamily: fonts.semibold }]}>
              {recipe.savedCount >= 1000
                ? `${(recipe.savedCount / 1000).toFixed(1)}k`
                : recipe.savedCount}{" "}
              saved
            </Text>
          </View>
        </View>
      </BlurView>
    </MotiView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  // Social share card
  glassSurface: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  cardInner: {
    backgroundColor: glass.bgSubtle,
    padding: 14,
    gap: 10,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.stone[200],
  },
  authorName: {
    fontSize: 14,
    color: colors.stone[800],
  },
  time: {
    fontSize: 12,
    color: colors.stone[400],
  },
  recipeName: {
    fontSize: 17,
    color: colors.stone[900],
    letterSpacing: -0.3,
  },
  provenance: {
    fontSize: 13,
    color: colors.stone[400],
    fontStyle: "italic",
  },
  // Trending card
  trendingGlass: {
    width: 220,
    marginRight: 12,
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  trendingInner: {
    backgroundColor: glass.bgSubtle,
    padding: 14,
    gap: 10,
    minHeight: 130,
    justifyContent: "space-between",
  },
  trendingName: {
    fontSize: 15,
    color: colors.stone[900],
    letterSpacing: -0.2,
  },
  savedBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.stone[100],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedText: {
    fontSize: 11,
    color: colors.stone[500],
  },
});
