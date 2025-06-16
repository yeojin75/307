// app/(tabs)/_layout.tsx
import { getColors } from "@/constants/Colors";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function TabLayout() {
  return (
    <ThemeProvider>
      <InnerTabs />
    </ThemeProvider>
  );
}

function InnerTabs() {
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: () => null,
        tabBarButton: () => <View />, // 탭 클릭 막기
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 48,
          justifyContent: "center",
        },
        tabBarBackground: () => (
          <View style={styles.tabBackground}>
            <Text style={[styles.tabText, { color: colors.subtext }]}>
              © 2025 Team SmartBell
            </Text>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="chat" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
