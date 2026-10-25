import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { JobRow } from "../../src/JobRow";
import { Button, Empty, ErrorText, H1, H2, Muted, s, useApi } from "../../src/ui";

export default function Home() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const jobs = useApi<{ jobs: any[] }>(`/api/jobs?status=REQUESTED,ACCEPTED&from=${today}`);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => void jobs.reload(), [jobs.reload]));
  const isSidekick = user!.role === "SIDEKICK";
  const requested = jobs.data?.jobs.filter((j) => j.status === "REQUESTED") ?? [];
  const upcoming = jobs.data?.jobs.filter((j) => j.status === "ACCEPTED").slice(0, 10) ?? [];

  const act = async (id: string, action: "accept" | "decline") => {
    try {
      await api(`/api/jobs/${id}`, { method: "PATCH", body: { action } });
      jobs.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={jobs.loading} onRefresh={jobs.reload} />}>
      <H1>Hi, {user!.name.split(" ")[0]} 👋</H1>
      <ErrorText error={error ?? jobs.error} />
      <H2>{isSidekick ? "Requests awaiting you" : "Pending requests"}</H2>
      {requested.length ? (
        requested.map((j) => (
          <JobRow key={j.id} job={j} viewer={user!.role}>
            {isSidekick && (
              <View style={[s.row, { marginTop: 8 }]}>
                <Button title="Accept" onPress={() => act(j.id, "accept")} style={{ flex: 1 }} />
                <Button title="Decline" variant="ghost" onPress={() => act(j.id, "decline")} style={{ flex: 1 }} />
              </View>
            )}
          </JobRow>
        ))
      ) : (
        <Empty text="No pending requests." />
      )}
      <H2>Upcoming</H2>
      {upcoming.length ? upcoming.map((j) => <JobRow key={j.id} job={j} viewer={user!.role} />) : <Empty text="Nothing scheduled yet." />}
      {!isSidekick && <Muted>Tip: choose “Repeat” when booking to put a Sidekick on a weekly schedule.</Muted>}
    </ScrollView>
  );
}
