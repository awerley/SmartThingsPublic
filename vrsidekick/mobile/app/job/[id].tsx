import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { api, fmtDateTime, fmtTime, money, rateLabel } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, Chip, H1, Input, Loading, Muted, s, Status, useApi } from "../../src/ui";

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data, reload } = useApi<{ job: any }>(`/api/jobs/${id}`);
  const [hours, setHours] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  if (!data) return <Loading />;
  const job = data.job;
  const isSidekick = job.sidekick.userId === user!.id;
  const isHost = job.hostId === user!.id;
  const open = ["REQUESTED", "ACCEPTED"].includes(job.status);

  const act = async (body: Record<string, unknown>, confirm?: string) => {
    const run = async () => {
      try {
        await api(`/api/jobs/${id}`, { method: "PATCH", body });
        reload();
      } catch (e) {
        Alert.alert("Job", (e as Error).message);
      }
    };
    if (confirm) Alert.alert(confirm, undefined, [{ text: "No" }, { text: "Yes", style: "destructive", onPress: run }]);
    else run();
  };

  const openChat = async () => {
    const { conversations } = await api("/api/conversations");
    const c = conversations.find((c: any) => c.sidekickId === job.sidekickId && c.hostId === job.hostId);
    if (c) router.push(`/chat/${c.id}`);
  };

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <H1>{job.title}</H1>
      <View style={s.row}>
        <Status status={job.status} />
        {job.series && <Chip label={`🔁 ${job.series.frequency.toLowerCase()}`} />}
      </View>
      <Card>
        <Text style={s.label}>When</Text>
        <Text>{fmtDateTime(job.startAt)} – {fmtTime(job.endAt)}</Text>
        <Text style={[s.label, { marginTop: 8 }]}>Where</Text>
        <Text>{job.property.name}</Text>
        <Muted>{job.property.address}, {job.property.city} {job.property.zip}</Muted>
        {isSidekick && job.property.notes && <Muted>📝 {job.property.notes}</Muted>}
        <Text style={[s.label, { marginTop: 8 }]}>{isSidekick ? "Host" : "Sidekick"}</Text>
        <Text>{isSidekick ? `${job.host.name}${job.host.phone ? ` · ${job.host.phone}` : ""}` : job.sidekick.displayName}</Text>
        <Text style={[s.label, { marginTop: 8 }]}>Price</Text>
        <Text>{rateLabel(job.rateType, job.rateCents)} · {money(job.subtotalCents)} service</Text>
        {!isSidekick && <Muted>+ {money(job.serviceFeeCents)} fee = {money(job.totalCents)} {job.status === "COMPLETED" ? `(${job.paymentStatus.toLowerCase()})` : "est."}</Muted>}
        {job.description && <Text style={{ marginTop: 8 }}>{job.description}</Text>}
      </Card>

      <Button title="💬 Message" variant="ghost" onPress={openChat} />
      {isSidekick && job.status === "REQUESTED" && (
        <View style={s.row}>
          <Button title="Accept" onPress={() => act({ action: "accept" })} style={{ flex: 1 }} />
          <Button title="Decline" variant="ghost" onPress={() => act({ action: "decline" })} style={{ flex: 1 }} />
        </View>
      )}
      {isSidekick && job.status === "ACCEPTED" && new Date(job.startAt) <= new Date() && (
        <Card style={{ gap: 0 }}>
          {job.rateType === "HOURLY" && <Input label="Hours worked" keyboardType="decimal-pad" value={hours} onChangeText={setHours} />}
          <Button title="Mark complete & request payment" variant="accent" onPress={() => act({ action: "complete", actualHours: hours ? Number(hours) : undefined })} />
        </Card>
      )}
      {open && <Button title="Cancel this visit" variant="ghost" onPress={() => act({ action: "cancel" }, "Cancel this visit?")} />}
      {open && job.series && <Button title="Stop recurring schedule" variant="danger" onPress={() => act({ action: "cancel", wholeSeries: true }, "Cancel all future visits?")} />}

      {isHost && job.status === "COMPLETED" && !job.review && (
        <Card style={{ gap: 0 }}>
          <Text style={s.title}>Rate your Sidekick</Text>
          <View style={[s.row, { marginVertical: 8 }]}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text key={n} onPress={() => setRating(n)} style={{ fontSize: 28, color: n <= rating ? "#e6ad00" : "#d1d5db" }}>★</Text>
            ))}
          </View>
          <Input placeholder="How did it go?" multiline value={comment} onChangeText={setComment} />
          <Button
            title="Submit review"
            onPress={async () => {
              await api(`/api/jobs/${id}/review`, { body: { rating, comment: comment || undefined } }).catch((e) => Alert.alert("Review", e.message));
              reload();
            }}
          />
        </Card>
      )}
      {job.review && <Muted>Your review: {"★".repeat(job.review.rating)} {job.review.comment}</Muted>}
    </ScrollView>
  );
}
