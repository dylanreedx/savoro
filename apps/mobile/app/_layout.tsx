import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import "react-native-reanimated";

import "../global.css";
import { useAuthStore } from "../lib/stores/auth";
import { useNetworkStore } from "../lib/stores/network";
import { onAuthExpired } from "../lib/api";
import { OfflineBanner } from "../components/OfflineBanner";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(auth)",
};

SplashScreen.preventAutoHideAsync();

function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuth) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuth) {
      router.replace("/(tabs)/chat");
    }
  }, [isAuthenticated, isLoading, segments]);
}

/** Listen for 401s from the API client and auto-redirect to login */
function useAuthExpiredRedirect() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const unsubscribe = onAuthExpired(async () => {
      await logout();
      router.replace("/(auth)/login");
    });
    return unsubscribe;
  }, [router, logout]);
}

/** Start NetInfo listener on mount */
function useNetworkListener() {
  const startListening = useNetworkStore((s) => s.startListening);

  useEffect(() => {
    const unsubscribe = startListening();
    return unsubscribe;
  }, [startListening]);
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Regular": require("@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf"),
    "PlusJakartaSans-Medium": require("@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf"),
    "PlusJakartaSans-ExtraBold": require("@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  useAuthGuard();
  useAuthExpiredRedirect();
  useNetworkListener();

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="goal" options={{ presentation: "modal", headerShown: false }} />
        </Stack>
        <OfflineBanner />
      </View>
      <StatusBar style="dark" />
    </>
  );
}
