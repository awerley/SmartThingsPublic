import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { rateLabel } from "../../src/api";
import { Button, Card, Chip, Empty, Input, Loading, Muted, s, useApi } from "../../src/ui";

export default function Search() {
  const catalog = useApi<{ taskTypes: any[] }>("/api/catalog");
  const props = useApi<{ properties: any[] }>("/api/properties");
  const [zip, setZip] = useState("");
  const [taskTypeId, setTaskTypeId] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  useEffect(() => {
    const z = props.data?.properties[0]?.zip;
    if (z && !zip) {
      setZip(z);
      setQuery(`zip=${z}`);
    } else if (props.data && query === null) setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data]);
  const results = useApi<{ results: any[] }>(query === null ? null : `/api/sidekicks?${query}`);

  return (
    <View style={s.screen}>
      <View style={[s.pad, { paddingBottom: 0 }]}>
        <Input label="Rental ZIP" keyboardType="number-pad" maxLength={5} value={zip} onChangeText={setZip} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Any task" active={!taskTypeId} onPress={() => setTaskTypeId("")} />
          {catalog.data?.taskTypes.map((t) => (
            <Chip key={t.id} label={`${t.icon ?? ""} ${t.name}`} active={taskTypeId === t.id} onPress={() => setTaskTypeId(t.id)} />
          ))}
        </ScrollView>
        <Button title="Search" onPress={() => setQuery(new URLSearchParams(Object.entries({ zip, taskTypeId }).filter(([, v]) => v)).toString())} />
      </View>
      {results.loading ? (
        <Loading />
      ) : (
        <FlatList
          contentContainerStyle={s.pad}
          data={results.data?.results ?? []}
          keyExtractor={(x) => x.id}
          ListEmptyComponent={<Empty text="No Sidekicks match. Try posting a Sidekick Wanted ad." />}
          renderItem={({ item }) => {
            const task = item.tasks.find((t: any) => t.taskTypeId === taskTypeId) ?? item.tasks[0];
            return (
              <Pressable onPress={() => router.push(`/sidekick/${item.id}`)}>
                <Card>
                  <View style={s.row}>
                    <Text style={[s.title, { flex: 1 }]}>{item.displayName}</Text>
                    {task && <Text style={{ fontWeight: "700", color: "#1b2a6b" }}>{rateLabel(task.rateType, task.rateCents)}</Text>}
                  </View>
                  <Muted>
                    ★ {item.ratingAvg} ({item.ratingCount}){item.distanceMiles != null ? ` · ${item.distanceMiles} mi` : ""}
                    {item.providerType === "COMPANY" ? " · Company" : ""}
                    {item.insured ? " · Insured" : ""}
                  </Muted>
                  <Text numberOfLines={2}>{item.bio}</Text>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
