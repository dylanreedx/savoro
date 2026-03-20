import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { useDiscoverStore } from "../../lib/stores/discover";
import { colors, fonts, springPresets } from "../../constants/Colors";
import { SectionHeader } from "../../components/discover/SectionHeader";
import { KitchenCard } from "../../components/discover/KitchenCard";
import { RecipeShareCard, TrendingRecipeCard } from "../../components/discover/RecipeShareCard";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function DiscoverScreen() {
  const kitchens = useDiscoverStore((s) => s.kitchens);
  const socialFeed = useDiscoverStore((s) => s.socialFeed);
  const trending = useDiscoverStore((s) => s.trending);
  const fetchFeed = useDiscoverStore((s) => s.fetchFeed);
  const refresh = useDiscoverStore((s) => s.refresh);
  const isLoading = useDiscoverStore((s) => s.isLoading);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: fonts.bold }]}>Discover</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Your Kitchens ── */}
        <SectionHeader title="Your Kitchens" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {kitchens.map((kitchen, i) => (
            <KitchenCard key={kitchen.id} kitchen={kitchen} index={i} />
          ))}
        </ScrollView>

        {/* ── From Your People ── */}
        <SectionHeader title="From Your People" />
        {socialFeed.map((share, i) => (
          <RecipeShareCard key={share.id} share={share} index={i} />
        ))}

        {/* ── Trending ── */}
        <SectionHeader title="Trending" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {trending.map((recipe, i) => (
            <TrendingRecipeCard key={recipe.id} recipe={recipe} index={i} />
          ))}
        </ScrollView>
      </ScrollView>

      {/* Full-screen loading on first fetch */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.stone[400]} />
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 26,
    color: colors.stone[900],
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  horizontalRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.stone[50],
  },
});
