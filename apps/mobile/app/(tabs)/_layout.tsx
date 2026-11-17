import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "../../lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg, borderBottomColor: theme.border },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Courses",
          tabBarLabel: "Courses",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "Bookmarks",
          tabBarLabel: "Bookmarks",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🔖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="recent"
        options={{
          title: "Recent",
          tabBarLabel: "Recent",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⏱️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
