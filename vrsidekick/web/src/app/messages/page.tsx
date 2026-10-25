"use client";

import Link from "next/link";
import { fmtDateTime } from "@/lib/client";
import { RequireRole } from "@/components/AuthProvider";
import { Avatar, Empty, Loading, PageHeader, useApi } from "@/components/ui";

export default function Messages() {
  return (
    <RequireRole roles={["HOST", "SIDEKICK"]}>
      <Inbox />
    </RequireRole>
  );
}

function Inbox() {
  const { data, loading } = useApi<{ conversations: any[] }>("/api/conversations");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Messages" />
      {loading ? (
        <Loading />
      ) : data?.conversations.length ? (
        <div className="card divide-y p-0">
          {data.conversations.map((c) => (
            <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
              <Avatar name={c.otherName} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.otherName}</span>
                  {c.wantedAd && <span className="chip">Ad: {c.wantedAd.title}</span>}
                  {c.unread > 0 && <span className="rounded-full bg-flame-500 px-2 text-xs font-bold text-white">{c.unread}</span>}
                </div>
                <p className="truncate text-sm text-gray-600">{c.lastMessage?.body ?? "No messages yet"}</p>
              </div>
              {c.lastMessage && <span className="text-xs whitespace-nowrap text-gray-400">{fmtDateTime(c.lastMessage.createdAt)}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No conversations yet.</Empty>
      )}
    </div>
  );
}
