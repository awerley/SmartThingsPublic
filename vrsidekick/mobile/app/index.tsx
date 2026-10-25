import { Redirect, router } from "expo-router";
import { Image, Text, View } from "react-native";
import { useAuth } from "../src/auth";
import { Button, colors, Loading } from "../src/ui";

export default function Welcome() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Redirect href="/(tabs)" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.navyDark, padding: 24, justifyContent: "center", gap: 16 }}>
      <Image source={require("../assets/icon.png")} style={{ width: 160, height: 160, alignSelf: "center" }} />
      <Text style={{ textAlign: "center", fontSize: 32, fontWeight: "900", fontStyle: "italic" }}>
        <Text style={{ color: colors.flame }}>VR</Text>
        <Text style={{ color: "#fff" }}>SIDEKICK</Text>
      </Text>
      <Text style={{ color: "#ffffffcc", textAlign: "center", fontSize: 16 }}>
        Trusted local help for your vacation rental — turnovers, lawn, pool, repairs and more.
      </Text>
      <Button title="Sign in" variant="accent" onPress={() => router.push("/login")} />
      <Button title="Create an account" variant="ghost" onPress={() => router.push("/register")} />
    </View>
  );
}
