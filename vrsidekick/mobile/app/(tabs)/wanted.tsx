import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { api, fmtDate, money } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, Empty, Input, Muted, s, Status, useApi } from "../../src/ui";

export default function Wanted() {
  const { user } = useAuth();
  const isHost = user!.role === "HOST";
  const ads = useApi<{ ads: any[] }>(isHost ? "/api/wanted-ads?mine=1" : "/api/wanted-ads");
  useFocusEffect(useCallback(() => void ads.reload(), [ads.reload]));
  const [showForm, setShowForm] = useState(false);

  return (
    <FlatList
      contentContainerStyle={s.pad}
      data={ads.data?.ads ?? []}
      keyExtractor={(a) => a.id}
      refreshing={ads.loading}
      onRefresh={ads.reload}
      ListHeaderComponent={
        isHost ? (
          showForm ? <NewAd onDone={() => { setShowForm(false); ads.reload(); }} /> : <Button title="+ Post a Sidekick Wanted ad" variant="accent" onPress={() => setShowForm(true)} />
        ) : (
          <Muted>Open ads from hosts in your service area.</Muted>
        )
      }
      ListEmptyComponent={<Empty text={isHost ? "No ads yet." : "No open ads near you right now."} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/ad/${item.id}`)}>
          <Card>
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>{item.title}</Text>
              <Status status={item.status} />
            </View>
            <Muted>
              {item.taskType.name}
              {item.recurring ? ` · 🔁 ${item.frequency?.toLowerCase() ?? ""}` : ""}
              {item.budgetCents != null ? ` · ${money(item.budgetCents)}${item.rateType === "HOURLY" ? "/hr" : ""}` : ""}
              {item.distanceMiles != null ? ` · ${item.distanceMiles} mi` : ""} · {fmtDate(item.createdAt)}
            </Muted>
            <Text numberOfLines={2}>{item.description}</Text>
            {isHost && item._count && <Muted>💬 {item._count.conversations} responses</Muted>}
          </Card>
        </Pressable>
      )}
    />
  );
}

function NewAd({ onDone }: { onDone: () => void }) {
  const catalog = useApi<{ taskTypes: any[] }>("/api/catalog");
  const props = useApi<{ properties: any[] }>("/api/properties");
  const [f, setF] = useState({ title: "", description: "", budget: "" });
  const [taskTypeId, setTaskTypeId] = useState("");
  const prop = props.data?.properties[0];
  return (
    <Card style={{ gap: 0 }}>
      <Text style={s.label}>Task</Text>
      <View style={[s.wrap, { marginBottom: 8 }]}>
        {catalog.data?.taskTypes.map((t) => (
          <Pressable key={t.id} onPress={() => setTaskTypeId(t.id)} style={[s.chip, taskTypeId === t.id && { backgroundColor: "#1b2a6b" }]}>
            <Text style={{ fontSize: 12, color: taskTypeId === t.id ? "#fff" : "#1b2a6b" }}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
      <Input label="Headline" value={f.title} onChangeText={(title) => setF({ ...f, title })} />
      <Input label="Details" multiline value={f.description} onChangeText={(description) => setF({ ...f, description })} />
      <Input label="Budget per visit ($, optional)" keyboardType="decimal-pad" value={f.budget} onChangeText={(budget) => setF({ ...f, budget })} />
      <Muted>{prop ? `For ${prop.name} (${prop.zip})` : "Add a property on the web first."}</Muted>
      <Button
        title="Publish"
        disabled={!prop || !taskTypeId}
        style={{ marginTop: 8 }}
        onPress={async () => {
          try {
            await api("/api/wanted-ads", {
              body: { taskTypeId, propertyId: prop.id, zip: prop.zip, title: f.title, description: f.description, budgetCents: f.budget ? Math.round(Number(f.budget) * 100) : null, rateType: f.budget ? "FLAT" : null },
            });
            onDone();
          } catch (e) {
            Alert.alert("Couldn't post", (e as Error).message);
          }
        }}
      />
    </Card>
  );
}
