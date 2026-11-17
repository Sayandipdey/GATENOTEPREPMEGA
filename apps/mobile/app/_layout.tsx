import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { isLoggedIn } from "../lib/auth";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Check auth state on mount; redirect to login if not authenticated
    (async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        router.replace("/(auth)/login");
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#030712" },
          headerTintColor: "#F9FAFB",
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: "#030712" },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="subject/[id]"
          options={{ title: "Subject Notes" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
