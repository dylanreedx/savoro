import { View, Text, Image, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import type { KitchenPreview } from "../../lib/stores/discover";
import { colors, glass, fonts, springPresets } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Kitchen card — horizontal scroll item (fixed width ~180)
// ---------------------------------------------------------------------------
interface KitchenCardProps {
  kitchen: KitchenPreview;
  index: number;
}

export function KitchenCard({ kitchen, index }: KitchenCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springPresets.gentle, delay: Math.min(index * 80, 240) }}
    >
      {/* Outer View (no overflow:hidden) so shadow/aura is not clipped */}
      <View style={[styles.auraWrapper, { shadowColor: kitchen.auraColor }]}>
        <BlurView intensity={glass.blur} tint={glass.tint} style={styles.glassSurface}>
          <View style={styles.inner}>
            <Text style={[styles.name, { fontFamily: fonts.semibold }]} numberOfLines={2}>
              {kitchen.name}
            </Text>

            {/* Overlapping avatar row */}
            <View style={styles.avatarRow}>
              {kitchen.memberAvatars.slice(0, 4).map((uri, i) => (
                <Image
                  key={`${kitchen.id}-avatar-${i}`}
                  source={{ uri }}
                  style={[
                    styles.avatar,
                    i > 0 && { marginLeft: -10 },
                    { zIndex: kitchen.memberAvatars.length - i },
                  ]}
                />
              ))}
              {kitchen.memberAvatars.length > 4 && (
                <View style={[styles.avatar, styles.avatarOverflow, { marginLeft: -10 }]}>
                  <Text style={[styles.overflowText, { fontFamily: fonts.medium }]}>
                    +{kitchen.memberAvatars.length - 4}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </View>
    </MotiView>
  );
}

const AVATAR_SIZE = 30;

const styles = StyleSheet.create({
  auraWrapper: {
    width: 180,
    marginRight: 12,
    borderRadius: glass.radius,
    // Shadow / aura glow — uses shadowColor from props
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  glassSurface: {
    borderRadius: glass.radius,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  inner: {
    backgroundColor: glass.bgSubtle,
    padding: 14,
    gap: 12,
    minHeight: 100,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    color: colors.stone[900],
    letterSpacing: -0.2,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: colors.stone[200],
  },
  avatarOverflow: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.stone[100],
  },
  overflowText: {
    fontSize: 10,
    color: colors.stone[500],
  },
});
