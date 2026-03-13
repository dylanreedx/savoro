import { View, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { colors, glass } from "../../constants/Colors";

/**
 * Animated "thinking" dots shown at the top of the chat list
 * (which is the bottom visually, since the list is inverted)
 * while the assistant is processing.
 */
export function ThinkingIndicator() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {[0, 1, 2].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "timing",
              duration: 600,
              delay: i * 200,
              loop: true,
            }}
            style={styles.dot}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  container: {
    flexDirection: "row",
    gap: 5,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: glass.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.stone[400],
  },
});
