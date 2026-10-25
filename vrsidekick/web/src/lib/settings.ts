import { db } from "./db";

export async function getSettings() {
  return db.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
