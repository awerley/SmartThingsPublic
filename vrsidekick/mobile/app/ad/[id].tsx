import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { api, fmtDate, money } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, H1, Input, Loading, Muted, s, Status, useApi } from "../../src/ui";

export default function AdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data, reload } = useApi<{ ad: any }>(`/api/wanted-ads/${id}`);
  const [msg, setMsg] = useState("");
  if (!data) return <Loading />;
  const ad = data.ad;
  const mine = ad.hostId === user!.id;
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <H1>{ad.title}</H1>
      <Status status={ad.status} />
      <Card>
        <Muted>
          {ad.taskType.name}
          {ad.recurring ? ` · 🔁 ${ad.frequency?.toLowerCase() ?? ""}` : ""}
          {ad.budgetCents != null ? ` · budget ${money(ad.budgetCents)}${ad.rateType === "HOURLY" ? "/hr" : ""}` : ""}
        </Muted>
        <Text>{ad.description}</Text>
        <Muted>📍 {ad.property ? `${ad.property.city}, ${ad.property.state}` : ad.zip} · posted {fmtDate(ad.createdAt)}</Muted>
      </Card>
      {user!.role === "SIDEKICK" && ad.status === "OPEN" && (
        <>
          <Input label="Introduce yourself" multiline value={msg} onChangeText={setMsg} />
          <Button
            title="Message the host"
            variant="accent"
            disabled={!msg.trim()}
            onPress={async () => {
              try {
                const { conversation } = await api(`/api/wanted-ads/${id}/respond`, { body: { message: msg } });
                router.replace(`/chat/${conversation.id}`);
              } catch (e) {
                Alert.alert("Couldn't send", (e as Error).message);
              }
            }}
          />
        </>
      )}
      {mine && (
        <Button
          title={ad.status === "OPEN" ? "Mark filled" : "Reopen"}
          onPress={async () => {
            await api(`/api/wanted-ads/${id}`, { method: "PATCH", body: { status: ad.status === "OPEN" ? "FILLED" : "OPEN" } });
            reload();
          }}
        />
      )}
    </ScrollView>
  );
}
