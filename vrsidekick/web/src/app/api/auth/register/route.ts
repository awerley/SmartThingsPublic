import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, publicUser, setAuthCookie, signToken } from "@/lib/auth";
import { badRequest, json, parseBody, route } from "@/lib/http";
import { geocodeZip } from "@/lib/geo";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(200),
  role: z.enum(["HOST", "SIDEKICK"]),
  phone: z.string().max(30).optional(),
  providerType: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  companyName: z.string().max(120).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  timezone: z.string().optional(),
});

export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  if (await db.user.findUnique({ where: { email: input.email } })) throw badRequest("An account with that email already exists");
  const geo = input.role === "SIDEKICK" && input.zip ? await geocodeZip(input.zip) : null;
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      ...(input.role === "SIDEKICK"
        ? {
            sidekick: {
              create: {
                providerType: input.providerType ?? "INDIVIDUAL",
                displayName: input.providerType === "COMPANY" && input.companyName ? input.companyName : input.name,
                companyName: input.companyName,
                baseZip: input.zip,
                baseLat: geo?.lat,
                baseLng: geo?.lng,
                serviceZips: input.zip ? [input.zip] : [],
                timezone: input.timezone ?? "America/New_York",
                // Sensible default schedule: weekdays 8am-5pm, editable on the Availability page.
                rules: {
                  create: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMinute: 480, endMinute: 1020 })),
                },
              },
            },
          }
        : {}),
    },
  });
  const token = await signToken(user.id, user.role);
  await setAuthCookie(token);
  return json({ user: publicUser(user), token }, 201);
});
