import { NextResponse } from "next/server";
import { completeCardSetup } from "@/lib/stripe";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  let ok = false;
  if (sessionId) {
    try {
      ok = !!(await completeCardSetup(sessionId));
    } catch (e) {
      console.error(e);
    }
  }
  return NextResponse.redirect(new URL(`/account/payments?card=${ok ? "saved" : "failed"}`, url));
}
