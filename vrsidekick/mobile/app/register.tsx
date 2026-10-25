import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useAuth } from "../src/auth";
import { Button, Chip, ErrorText, Input, Muted, s } from "../src/ui";

export default function Register() {
  const { register } = useAuth();
  const [role, setRole] = useState<"HOST" | "SIDEKICK">("HOST");
  const [providerType, setProviderType] = useState<"INDIVIDUAL" | "COMPANY">("INDIVIDUAL");
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", zip: "", companyName: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.label}>I am a…</Text>
      <View style={s.wrap}>
        <Chip label="🏠 Host" active={role === "HOST"} onPress={() => setRole("HOST")} />
        <Chip label="⚡ Sidekick" active={role === "SIDEKICK"} onPress={() => setRole("SIDEKICK")} />
      </View>
      {role === "SIDEKICK" && (
        <View style={s.wrap}>
          <Chip label="Individual" active={providerType === "INDIVIDUAL"} onPress={() => setProviderType("INDIVIDUAL")} />
          <Chip label="Company" active={providerType === "COMPANY"} onPress={() => setProviderType("COMPANY")} />
        </View>
      )}
      <ErrorText error={error} />
      {role === "SIDEKICK" && providerType === "COMPANY" && <Input label="Company name" value={f.companyName} onChangeText={set("companyName")} />}
      <Input label="Full name" value={f.name} onChangeText={set("name")} />
      <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={set("email")} />
      <Input label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={set("phone")} />
      <Input label="Password (8+ characters)" secureTextEntry value={f.password} onChangeText={set("password")} />
      {role === "SIDEKICK" && <Input label="Home base ZIP" keyboardType="number-pad" maxLength={5} value={f.zip} onChangeText={set("zip")} />}
      {role === "SIDEKICK" && <Muted>After signing up, finish your services, rates and availability from the web dashboard or the Account tab.</Muted>}
      <Button
        title="Create account"
        onPress={async () => {
          try {
            await register({
              role,
              name: f.name,
              email: f.email.trim(),
              password: f.password,
              phone: f.phone || undefined,
              ...(role === "SIDEKICK"
                ? { providerType, companyName: providerType === "COMPANY" ? f.companyName : undefined, zip: f.zip || undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
                : {}),
            });
            router.replace("/(tabs)");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </ScrollView>
  );
}
