import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../src/auth";
import { colors, Loading } from "../../src/ui";

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{glyph}</Text>;

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/" />;
  const isHost = user.role === "HOST";
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navyDark },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.navy,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="search" options={{ title: "Find", tabBarIcon: icon("🔍"), href: isHost ? undefined : null }} />
      <Tabs.Screen name="wanted" options={{ title: isHost ? "My Ads" : "Wanted", tabBarIcon: icon("📣") }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: icon("📅") }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("👤") }} />
    </Tabs>
  );
}
