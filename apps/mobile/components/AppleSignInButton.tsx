import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Platform, StyleSheet } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthStore } from "../lib/stores/auth";
import { ApiError } from "../lib/api";
import { colors, fonts } from "../constants/Colors";

type Props = {
  onError?: (message: string) => void;
};

export function AppleSignInButton({ onError }: Props) {
  const loginWithApple = useAuthStore((s) => s.loginWithApple);
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== "ios") return null;

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        onError?.("Apple Sign-In failed: no identity token received");
        return;
      }

      await loginWithApple(credential.identityToken, credential.fullName);
    } catch (e: unknown) {
      // User cancelled — do nothing
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Apple Sign-In failed";
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handleAppleSignIn}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.stone[50]} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.appleIcon}>{"\uF8FF"}</Text>
          <Text style={[styles.label, { fontFamily: fonts.semibold }]}>
            Continue with Apple
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.stone[900],
    paddingVertical: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appleIcon: {
    fontSize: 18,
    color: colors.stone[50],
    marginTop: -1,
  },
  label: {
    fontSize: 16,
    color: colors.stone[50],
  },
});
