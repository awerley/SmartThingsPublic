import { z } from "zod";
import { db } from "@/lib/db";
import { publicUser, setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { HttpError, json, parseBody, route } from "@/lib/http";

const schema = z.object({ email: z.string().email().transform((e) => e.toLowerCase()), password: z.string() });

export const POST = route(async (req) => {
  const { email, password } = await parseBody(req, schema);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
  if (user.status !== "ACTIVE") throw new HttpError(403, "This account has been suspended");
  const token = await signToken(user.id, user.role);
  await setAuthCookie(token);
  return json({ user: publicUser(user), token });
});
