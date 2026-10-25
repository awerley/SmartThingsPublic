import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { useAuth } from "../src/auth";
import { Button, ErrorText, Input, s } from "../src/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <ErrorText error={error} />
      <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        title="Sign in"
        onPress={async () => {
          try {
            await login(email.trim(), password);
            router.replace("/(tabs)");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </ScrollView>
  );
}
