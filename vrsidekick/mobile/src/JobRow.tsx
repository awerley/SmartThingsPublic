import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { fmtDateTime, money } from "./api";
import { Card, Muted, s, Status } from "./ui";

export function JobRow({ job, viewer, children }: { job: any; viewer: string; children?: React.ReactNode }) {
  return (
    <Pressable onPress={() => router.push(`/job/${job.id}`)}>
      <Card>
        <View style={s.row}>
          <Text style={[s.title, { flexShrink: 1 }]}>{job.title}</Text>
          <Status status={job.status} />
          {job.seriesId && <Text>🔁</Text>}
        </View>
        <Text>{fmtDateTime(job.startAt)}</Text>
        <Muted>
          {job.taskType.name} · {job.property.name} · {viewer === "SIDEKICK" ? job.host.name : job.sidekick.displayName} · {money(viewer === "SIDEKICK" ? job.subtotalCents : job.totalCents)}
        </Muted>
        {children}
      </Card>
    </Pressable>
  );
}
