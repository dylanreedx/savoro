import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../../constants/Colors";

// ---------------------------------------------------------------------------
// Section header for Discover screen sections
// ---------------------------------------------------------------------------
interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontFamily: fonts.bold }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    color: colors.stone[900],
    letterSpacing: -0.3,
  },
});
