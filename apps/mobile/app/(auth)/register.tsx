import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { MotiView } from "moti";
import { useAuthStore } from "../../lib/stores/auth";
import { ApiError } from "../../lib/api";
import { AppleSignInButton } from "../../components/AppleSignInButton";
import { colors, glass, fonts } from "../../constants/Colors";

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!email || !username || !password) {
      setError("All fields are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      setError("Username: 3-30 chars, lowercase, numbers, hyphens, or underscores");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), username.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-stone-50"
    >
      <View className="flex-1 justify-end px-6 pb-12">
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
          className="mb-10"
        >
          <Text style={[styles.title, { fontFamily: fonts.extrabold }]}>
            Create account
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fonts.regular }]}>
            Start tracking your nutrition
          </Text>
        </MotiView>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { fontFamily: fonts.medium }]}>{error}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View className="mb-3">
          <TextInput
            style={[styles.input, { fontFamily: fonts.regular }]}
            placeholder="Email"
            placeholderTextColor={colors.stone[400]}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Username */}
        <View className="mb-3">
          <TextInput
            style={[styles.input, { fontFamily: fonts.regular }]}
            placeholder="Username"
            placeholderTextColor={colors.stone[400]}
            autoCapitalize="none"
            autoComplete="username-new"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        {/* Password */}
        <View className="mb-6">
          <TextInput
            style={[styles.input, { fontFamily: fonts.regular }]}
            placeholder="Password (8+ characters)"
            placeholderTextColor={colors.stone[400]}
            secureTextEntry
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={({ pressed }) => [styles.submitButton, { opacity: pressed ? 0.85 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.stone[50]} />
          ) : (
            <Text style={[styles.submitText, { fontFamily: fonts.semibold }]}>
              Create account
            </Text>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow} className="my-6">
          <View style={styles.dividerLine} />
          <Text style={[styles.dividerText, { fontFamily: fonts.regular }]}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Apple Sign-In */}
        <AppleSignInButton onError={(msg) => setError(msg)} />

        {/* Login link */}
        <View className="mt-6 flex-row items-center justify-center">
          <Text style={[styles.linkText, { fontFamily: fonts.regular }]}>
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.linkAction, { fontFamily: fonts.semibold }]}>
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    color: colors.stone[900],
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: colors.stone[400],
  },
  errorBox: {
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: colors.blush[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.blush[500],
  },
  input: {
    borderRadius: 14,
    backgroundColor: colors.stone[100],
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.stone[900],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  submitButton: {
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: colors.stone[900],
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 16,
    color: colors.stone[50],
  },
  linkText: {
    fontSize: 14,
    color: colors.stone[400],
  },
  linkAction: {
    fontSize: 14,
    color: colors.stone[900],
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.stone[300],
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: colors.stone[400],
  },
});
