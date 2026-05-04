import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import { glass, colors, fonts } from "../../constants/Colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.stone[900],
        tabBarInactiveTintColor: colors.stone[400],
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: glass.borderSubtle,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={glass.blurHeavy}
            tint={glass.tint}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 10,
        },
        headerStyle: {
          backgroundColor: colors.stone[50],
        },
        headerTitleStyle: {
          fontFamily: fonts.bold,
        },
        headerTintColor: colors.stone[900],
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "bubble.left.fill" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          headerShown: false,
          title: "Discover",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "safari.fill" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          headerShown: false,
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "chart.bar.fill" }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
