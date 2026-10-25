import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { api, fmtDateTime } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, colors, s, useApi } from "../../src/ui";

type Msg = { id: string; senderId: string; body: string; createdAt: string };

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const convo = useApi<{ conversation: any }>(`/api/conversations/${id}`);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const last = useRef<string | null>(null);
  const list = useRef<FlatList<Msg>>(null);

  // Poll for new messages while the screen is open.
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const q = last.current ? `?after=${encodeURIComponent(last.current)}` : "";
      const { messages: fresh } = await api<{ messages: Msg[] }>(`/api/conversations/${id}/messages${q}`).catch(() => ({ messages: [] as Msg[] }));
      if (!stop && fresh.length) {
        last.current = fresh[fresh.length - 1].createdAt;
        setMessages((m) => [...m, ...fresh.filter((x) => !m.some((y) => y.id === x.id))]);
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  const c = convo.data?.conversation;
  const title = c ? (c.hostId === user!.id ? c.sidekick.displayName : c.host.name) : "Chat";

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title }} />
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user!.id;
          return (
            <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", backgroundColor: mine ? colors.navy : "#fff", borderRadius: 16, padding: 10, borderWidth: mine ? 0 : 1, borderColor: colors.border }}>
              <Text style={{ color: mine ? "#fff" : colors.text }}>{item.body}</Text>
              <Text style={{ color: mine ? "#ffffff99" : colors.muted, fontSize: 10, marginTop: 4 }}>{fmtDateTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={[s.row, { padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderColor: colors.border }]}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Write a message…" value={body} onChangeText={setBody} />
        <Button
          title="Send"
          disabled={!body.trim()}
          onPress={async () => {
            const { message } = await api<{ message: Msg }>(`/api/conversations/${id}/messages`, { body: { body } });
            setBody("");
            last.current = message.createdAt;
            setMessages((m) => [...m, message]);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
