"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { api, fmtDateTime } from "@/lib/client";
import { RequireRole, useAuth } from "@/components/AuthProvider";
import { ErrorNote, Loading, useApi } from "@/components/ui";

type Msg = { id: string; senderId: string; body: string; createdAt: string };

export default function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireRole>
      <ThreadInner id={id} />
    </RequireRole>
  );
}

function ThreadInner({ id }: { id: string }) {
  const { user } = useAuth();
  const convo = useApi<{ conversation: any }>(`/api/conversations/${id}`);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);

  // Simple polling keeps the thread live without a websocket server.
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const q = last.current ? `?after=${encodeURIComponent(last.current)}` : "";
        const { messages: fresh } = await api<{ messages: Msg[] }>(`/api/conversations/${id}/messages${q}`);
        if (!stop && fresh.length) {
          last.current = fresh[fresh.length - 1].createdAt;
          setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))]);
        }
      } catch (e) {
        if (!stop) setErr((e as Error).message);
      }
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      const { message } = await api<{ message: Msg }>(`/api/conversations/${id}/messages`, { body: { body } });
      setBody("");
      last.current = message.createdAt;
      setMessages((m) => [...m, message]);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!convo.data) return <Loading />;
  const c = convo.data.conversation;
  const isHost = c.hostId === user!.id;
  const other = isHost ? c.sidekick.displayName : c.host.name;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Link href="/messages" className="text-sm text-navy-700">←</Link>
        <h1 className="text-xl font-extrabold text-navy-900">{other}</h1>
        {isHost && <Link href={`/sidekicks/${c.sidekickId}`} className="btn-accent ml-auto">Book {other.split(" ")[0]}</Link>}
        {c.wantedAd && <span className="chip">Re: {c.wantedAd.title}</span>}
      </div>
      <ErrorNote error={err} />
      <div className="card flex-1 space-y-3 overflow-y-auto">
        {messages.map((m) => {
          const mine = m.senderId === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-navy-700 text-white" : "bg-gray-100 text-gray-900"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-gray-400"}`}>{fmtDateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="Write a message…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn-primary">Send</button>
      </form>
    </div>
  );
}
