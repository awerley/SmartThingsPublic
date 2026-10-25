import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/auth";
import { colors } from "../src/ui";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navyDark },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sidekick/[id]" options={{ title: "Sidekick" }} />
        <Stack.Screen name="job/[id]" options={{ title: "Job" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
        <Stack.Screen name="ad/[id]" options={{ title: "Sidekick Wanted" }} />
      </Stack>
    </AuthProvider>
  );
}
