import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { fmtDateTime } from "../../src/api";
import { Card, colors, Empty, Muted, s, useApi } from "../../src/ui";

export default function Messages() {
  const list = useApi<{ conversations: any[] }>("/api/conversations");
  useFocusEffect(useCallback(() => void list.reload(), [list.reload]));
  return (
    <FlatList
      contentContainerStyle={s.pad}
      data={list.data?.conversations ?? []}
      keyExtractor={(c) => c.id}
      refreshing={list.loading}
      onRefresh={list.reload}
      ListEmptyComponent={<Empty text="No conversations yet." />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/chat/${item.id}`)}>
          <Card>
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>{item.otherName}</Text>
              {item.unread > 0 && (
                <View style={{ backgroundColor: colors.flame, borderRadius: 99, paddingHorizontal: 7 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{item.unread}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1}>{item.lastMessage?.body ?? "No messages yet"}</Text>
            {item.lastMessage && <Muted>{fmtDateTime(item.lastMessage.createdAt)}</Muted>}
          </Card>
        </Pressable>
      )}
    />
  );
}
