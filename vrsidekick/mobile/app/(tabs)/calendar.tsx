import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { dayKey, fmtTime } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, colors, Empty, Muted, s, Status, useApi } from "../../src/ui";

/** Agenda-style calendar: one month at a time, grouped by day. */
export default function Calendar() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const feed = useApi<any>(`/api/calendar?from=${month.toISOString()}&to=${end.toISOString()}`);
  useFocusEffect(useCallback(() => void feed.reload(), [feed.reload]));
  const isSidekick = user!.role === "SIDEKICK";

  const days = useMemo(() => {
    const m = new Map<string, { events: any[]; open: any[] }>();
    const get = (k: string) => m.get(k) ?? (m.set(k, { events: [], open: [] }), m.get(k)!);
    for (const e of feed.data?.events ?? []) get(dayKey(new Date(e.start))).events.push(e);
    if (isSidekick) for (const a of feed.data?.availability ?? []) get(dayKey(new Date(a.start))).open.push(a);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [feed.data, isSidekick]);

  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={s.row}>
        <Button title="←" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        <Text style={[s.title, { flex: 1, textAlign: "center" }]}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
        <Button title="→" variant="ghost" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
      </View>
      {days.length === 0 && <Empty text="Nothing this month." />}
      {days.map(([k, d]) => (
        <View key={k} style={{ gap: 6 }}>
          <Text style={{ fontWeight: "700", color: colors.navyDark, marginTop: 6 }}>
            {new Date(`${k}T12:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </Text>
          {d.events.map((e) => (
            <Pressable key={e.id} onPress={() => router.push(`/job/${e.id}`)}>
              <Card>
                <View style={s.row}>
                  <Text style={[s.title, { flex: 1 }]}>{e.title}</Text>
                  <Status status={e.status} />
                  {e.recurring && <Text>🔁</Text>}
                </View>
                <Text>{fmtTime(e.start)} – {fmtTime(e.end)}</Text>
                <Muted>{e.subtitle}</Muted>
              </Card>
            </Pressable>
          ))}
          {d.open.length > 0 && (
            <View style={s.wrap}>
              {d.open.map((a) => (
                <View key={a.start} style={[s.chip, { backgroundColor: colors.greenBg }]}>
                  <Text style={{ fontSize: 12, color: colors.green }}>Open {fmtTime(a.start)}–{fmtTime(a.end)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
