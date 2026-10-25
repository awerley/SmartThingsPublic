import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { api } from "./api";

export const colors = {
  navy: "#1b2a6b",
  navyDark: "#111b47",
  navyLight: "#eef1fa",
  gold: "#f8c21c",
  flame: "#e5202e",
  bg: "#f6f7fb",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  green: "#166534",
  greenBg: "#dcfce7",
};

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, loading, reload: load };
}

export function Button({ title, onPress, variant = "primary", disabled, style }: { title: string; onPress: () => void; variant?: "primary" | "accent" | "ghost" | "danger"; disabled?: boolean; style?: ViewStyle }) {
  const bg = { primary: colors.navy, accent: colors.gold, ghost: "#fff", danger: colors.flame }[variant];
  const fg = { primary: "#fff", accent: colors.navyDark, ghost: colors.text, danger: "#fff" }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, variant === "ghost" && { borderWidth: 1, borderColor: colors.border }, style]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Input({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput placeholderTextColor="#9ca3af" {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }]} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.navy }]}>
      <Text style={{ fontSize: 12, color: active ? "#fff" : colors.navy, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

const STATUS: Record<string, [string, string]> = {
  REQUESTED: ["#fef3c7", "#92400e"],
  ACCEPTED: [colors.greenBg, colors.green],
  ACTIVE: [colors.greenBg, colors.green],
  OPEN: [colors.greenBg, colors.green],
  COMPLETED: [colors.navyLight, colors.navy],
};

export function Status({ status }: { status: string }) {
  const [bg, fg] = STATUS[status] ?? ["#e5e7eb", "#374151"];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{status.charAt(0) + status.slice(1).toLowerCase()}</Text>
    </View>
  );
}

export const Loading = () => <ActivityIndicator style={{ margin: 24 }} color={colors.navy} />;
export const ErrorText = ({ error }: { error?: string | null }) => (error ? <Text style={{ color: colors.flame, marginBottom: 8 }}>{error}</Text> : null);
export const Empty = ({ text }: { text: string }) => <Text style={{ color: colors.muted, textAlign: "center", padding: 24 }}>{text}</Text>;
export const H1 = ({ children }: { children: React.ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children }: { children: React.ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Muted = ({ children }: { children: React.ReactNode }) => <Text style={{ color: colors.muted, fontSize: 13 }}>{children}</Text>;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 4 },
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  btnText: { fontWeight: "700", fontSize: 15 },
  label: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginBottom: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  chip: { backgroundColor: colors.navyLight, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  h1: { fontSize: 24, fontWeight: "800", color: colors.navyDark },
  h2: { fontSize: 17, fontWeight: "700", color: colors.navyDark, marginTop: 8 },
  title: { fontSize: 16, fontWeight: "700", color: colors.navyDark },
});
