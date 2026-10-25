import { json, route, searchParams } from "@/lib/http";
import { searchSidekicks } from "@/lib/services/sidekicks";

/** Host search: filter by service area (ZIP), task type, skill, tool or keyword. */
export const GET = route(async (req) => {
  const sp = searchParams(req);
  const results = await searchSidekicks({
    zip: sp.get("zip"),
    taskTypeId: sp.get("taskTypeId"),
    skillId: sp.get("skillId"),
    toolId: sp.get("toolId"),
    q: sp.get("q"),
  });
  return json({ results });
});
