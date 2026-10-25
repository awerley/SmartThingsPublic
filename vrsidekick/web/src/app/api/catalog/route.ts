import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { getSettings } from "@/lib/settings";

/** Active task types, skills and tools (for profiles and search filters) plus current service fees. */
export const GET = route(async () => {
  const [taskTypes, skills, tools, settings] = await Promise.all([
    db.taskType.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.skill.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.tool.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  const { oneTimeFeePercent, recurringFeePercent, minimumFeeCents } = settings;
  return json({ taskTypes, skills, tools, fees: { oneTimeFeePercent, recurringFeePercent, minimumFeeCents } });
});
