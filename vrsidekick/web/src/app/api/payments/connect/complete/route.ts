import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { refreshPayoutStatus } from "@/lib/stripe";

export async function GET(req: Request) {
  const user = await currentUser();
  const profile = user ? await db.sidekickProfile.findUnique({ where: { userId: user.id } }) : null;
  if (profile) await refreshPayoutStatus(profile).catch(console.error);
  return NextResponse.redirect(new URL("/account/payments?payouts=updated", req.url));
}
