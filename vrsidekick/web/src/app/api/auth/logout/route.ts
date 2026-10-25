import { clearAuthCookie } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const POST = route(async () => {
  await clearAuthCookie();
  return json({ ok: true });
});
