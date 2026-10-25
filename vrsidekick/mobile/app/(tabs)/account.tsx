import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { api, API_URL, dayKey, fmtDateTime, fmtTime } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, Chip, H2, Input, Muted, s, useApi } from "../../src/ui";

export default function Account() {
  const { user, logout, refresh } = useAuth();
  const pay = useApi<any>("/api/payments");
  const isSidekick = user!.role === "SIDEKICK";

  async function openStripe(path: string) {
    try {
      const { url } = await api(path, { method: "POST" });
      await WebBrowser.openBrowserAsync(url);
      await refresh();
      pay.reload();
    } catch (e) {
      Alert.alert("Payments", (e as Error).message);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Card>
        <Text style={s.title}>{user!.name}</Text>
        <Muted>{user!.email} · {user!.role.toLowerCase()}</Muted>
      </Card>

      <H2>{isSidekick ? "Payouts" : "Payment method"}</H2>
      <Card>
        {!pay.data ? (
          <Muted>Loading…</Muted>
        ) : !pay.data.paymentsEnabled ? (
          <Muted>Payments are in demo mode on this server.</Muted>
        ) : isSidekick ? (
          <>
            <Text>{pay.data.payoutsEnabled ? "✅ Payouts enabled" : "Payouts not set up yet"}</Text>
            <Button title={pay.data.payoutsEnabled ? "Update payout details" : "Set up payouts"} onPress={() => openStripe("/api/payments/connect")} style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <Text>{pay.data.hasPaymentMethod ? "✅ Card on file" : "No card on file"}</Text>
            <Button title={pay.data.hasPaymentMethod ? "Replace card" : "Add a card"} onPress={() => openStripe("/api/payments/setup")} style={{ marginTop: 8 }} />
          </>
        )}
      </Card>

      {isSidekick && <BlockTime />}

      <H2>More</H2>
      <Button
        title={isSidekick ? "Edit profile, rates & weekly schedule (web)" : "Manage properties (web)"}
        variant="ghost"
        onPress={() => WebBrowser.openBrowserAsync(`${API_URL}${isSidekick ? "/profile" : "/properties"}`)}
      />
      <Button
        title="Sign out"
        variant="danger"
        onPress={async () => {
          await logout();
          router.replace("/");
        }}
      />
    </ScrollView>
  );
}

/** Quick block-out / one-off availability for sidekicks on the go. */
function BlockTime() {
  const avail = useApi<any>("/api/me/availability");
  const [kind, setKind] = useState<"BLOCK" | "EXTRA">("BLOCK");
  const [f, setF] = useState({ date: dayKey(new Date()), start: "09:00", end: "12:00", reason: "" });
  return (
    <>
      <H2>Availability changes</H2>
      <Card style={{ gap: 0 }}>
        <View style={s.wrap}>
          <Chip label="Block time" active={kind === "BLOCK"} onPress={() => setKind("BLOCK")} />
          <Chip label="Extra availability" active={kind === "EXTRA"} onPress={() => setKind("EXTRA")} />
        </View>
        <Input label="Date (YYYY-MM-DD)" value={f.date} onChangeText={(date) => setF({ ...f, date })} />
        <View style={s.row}>
          <View style={{ flex: 1 }}><Input label="From (HH:MM)" value={f.start} onChangeText={(start) => setF({ ...f, start })} /></View>
          <View style={{ flex: 1 }}><Input label="To (HH:MM)" value={f.end} onChangeText={(end) => setF({ ...f, end })} /></View>
        </View>
        <Input label="Note" placeholder="Travel, appointment…" value={f.reason} onChangeText={(reason) => setF({ ...f, reason })} />
        <Button
          title={kind === "BLOCK" ? "Block this time" : "Add availability"}
          variant={kind === "BLOCK" ? "primary" : "accent"}
          onPress={async () => {
            try {
              await api("/api/me/availability/exceptions", {
                body: { kind, startAt: new Date(`${f.date}T${f.start}`).toISOString(), endAt: new Date(`${f.date}T${f.end}`).toISOString(), reason: f.reason || undefined },
              });
              setF({ ...f, reason: "" });
              avail.reload();
            } catch (e) {
              Alert.alert("Couldn't save", (e as Error).message);
            }
          }}
        />
      </Card>
      {avail.data?.exceptions.map((e: any) => (
        <Card key={e.id}>
          <View style={s.row}>
            <Text style={{ flex: 1 }}>
              {e.kind === "BLOCK" ? "⛔ Blocked" : "✅ Extra"} {fmtDateTime(e.startAt)}–{fmtTime(e.endAt)} {e.reason ? `· ${e.reason}` : ""}
            </Text>
            <Text style={{ color: "#e5202e", padding: 4 }} onPress={async () => { await api(`/api/me/availability/exceptions/${e.id}`, { method: "DELETE" }); avail.reload(); }}>✕</Text>
          </View>
        </Card>
      ))}
    </>
  );
}
