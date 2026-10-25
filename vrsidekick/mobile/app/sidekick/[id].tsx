import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { api, dayKey, fmtDate, fmtTime, money, rateLabel } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, Chip, H1, H2, Input, Loading, Muted, s, useApi } from "../../src/ui";

const pad = (n: number) => String(n).padStart(2, "0");

export default function SidekickScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, paymentsEnabled } = useAuth();
  const { data } = useApi<{ sidekick: any; reviews: any[] }>(`/api/sidekicks/${id}`);
  const avail = useApi<{ windows: { start: string; end: string }[] }>(`/api/sidekicks/${id}/availability`);
  const props = useApi<{ properties: any[] }>(user?.role === "HOST" ? "/api/properties" : null);
  const [taskTypeId, setTaskTypeId] = useState<string | null>(null);
  const [f, setF] = useState({ date: "", time: "10:00", hours: "2", details: "", message: "" });
  const [repeat, setRepeat] = useState<"" | "WEEKLY" | "BIWEEKLY" | "MONTHLY">("");
  const [busy, setBusy] = useState(false);

  if (!data) return <Loading />;
  const sk = data.sidekick;
  const task = sk.tasks.find((t: any) => t.taskTypeId === (taskTypeId ?? sk.tasks[0]?.taskTypeId));
  const property = props.data?.properties[0];

  async function message() {
    try {
      const { conversation } = await api("/api/conversations", { body: { sidekickId: sk.id, message: f.message } });
      router.push(`/chat/${conversation.id}`);
    } catch (e) {
      Alert.alert("Message", (e as Error).message);
    }
  }

  async function book() {
    if (!property || !task) return;
    setBusy(true);
    try {
      const { job } = await api("/api/jobs", {
        body: {
          sidekickId: sk.id,
          propertyId: property.id,
          taskTypeId: task.taskTypeId,
          title: task.taskType,
          description: f.details || undefined,
          startAt: new Date(`${f.date}T${f.time}`).toISOString(),
          durationMinutes: Math.round(Number(f.hours) * 60),
          recurrence: repeat ? { frequency: repeat } : null,
        },
      });
      router.replace(`/job/${job.id}`);
    } catch (e) {
      Alert.alert("Couldn't request", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <H1>{sk.displayName}</H1>
      <Muted>
        ★ {sk.ratingAvg} ({sk.ratingCount}){sk.providerType === "COMPANY" ? " · Company" : ""}{sk.insured ? " · Insured" : ""} · serves {sk.serviceRadiusMiles} mi
      </Muted>
      {sk.bio && <Text>{sk.bio}</Text>}

      <H2>Services</H2>
      <Card>
        {sk.tasks.map((t: any) => (
          <View key={t.id} style={[s.row, { paddingVertical: 4 }]}>
            <Text style={{ flex: 1 }}>{t.taskType}</Text>
            <Text style={{ fontWeight: "700" }}>{rateLabel(t.rateType, t.rateCents)}</Text>
          </View>
        ))}
      </Card>
      <View style={s.wrap}>
        {[...sk.skills, ...sk.tools].map((x: any) => <Chip key={x.id} label={x.name} />)}
      </View>

      {user?.role === "HOST" && (
        <>
          <H2>Ask a question</H2>
          <Input placeholder="Can you handle a 3BR turnover Saturdays?" multiline value={f.message} onChangeText={(message) => setF({ ...f, message })} />
          <Button title="💬 Send message" variant="ghost" disabled={!f.message.trim()} onPress={message} />

          <H2>Request a job</H2>
          {!property ? (
            <Muted>Add a property first (web → Properties).</Muted>
          ) : paymentsEnabled && !user.hasPaymentMethod ? (
            <Muted>Add a payment method in the Account tab first.</Muted>
          ) : (
            <Card style={{ gap: 0 }}>
              <Muted>For {property.name}</Muted>
              <Text style={[s.label, { marginTop: 8 }]}>Task</Text>
              <View style={s.wrap}>
                {sk.tasks.map((t: any) => <Chip key={t.id} label={t.taskType} active={task?.id === t.id} onPress={() => setTaskTypeId(t.taskTypeId)} />)}
              </View>
              <Text style={[s.label, { marginTop: 8 }]}>Pick an open time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {(avail.data?.windows ?? []).map((w) => {
                  const d = new Date(w.start);
                  return (
                    <Chip
                      key={w.start}
                      label={`${fmtDate(d)} ${fmtTime(d)}–${fmtTime(w.end)}`}
                      active={f.date === dayKey(d) && f.time === `${pad(d.getHours())}:${pad(d.getMinutes())}`}
                      onPress={() => setF({ ...f, date: dayKey(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` })}
                    />
                  );
                })}
              </ScrollView>
              <View style={s.row}>
                <View style={{ flex: 1 }}><Input label="Date" placeholder="YYYY-MM-DD" value={f.date} onChangeText={(date) => setF({ ...f, date })} /></View>
                <View style={{ flex: 1 }}><Input label="Start" placeholder="HH:MM" value={f.time} onChangeText={(time) => setF({ ...f, time })} /></View>
                <View style={{ flex: 1 }}><Input label="Hours" keyboardType="decimal-pad" value={f.hours} onChangeText={(hours) => setF({ ...f, hours })} /></View>
              </View>
              <Text style={s.label}>Repeat</Text>
              <View style={s.wrap}>
                {(["", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const).map((r) => (
                  <Chip key={r} label={r ? r.toLowerCase() : "one time"} active={repeat === r} onPress={() => setRepeat(r)} />
                ))}
              </View>
              <Input label="Details" multiline value={f.details} onChangeText={(details) => setF({ ...f, details })} />
              {task && (
                <Muted>
                  {task.rateType === "FLAT" ? money(task.rateCents) : `${money(task.rateCents * Number(f.hours || 0))} est.`} + marketplace fee · charged when complete
                </Muted>
              )}
              <Button title={busy ? "Sending…" : repeat ? "Request recurring job" : "Request job"} variant="accent" disabled={busy || !f.date} onPress={book} style={{ marginTop: 8 }} />
            </Card>
          )}
        </>
      )}

      <H2>Reviews</H2>
      {data.reviews.length ? data.reviews.map((r) => (
        <Card key={r.id}>
          <Text>{"★".repeat(r.rating)} {r.author}</Text>
          {r.comment && <Muted>{r.comment}</Muted>}
        </Card>
      )) : <Muted>No reviews yet.</Muted>}
    </ScrollView>
  );
}
