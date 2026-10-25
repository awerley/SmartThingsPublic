import { db } from "./db";
import { badRequest, notFound } from "./http";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Fields = { name?: string; slug?: string; description?: string | null; icon?: string | null; sortOrder?: number; active?: boolean };

/** Uniform admin operations over the three admin-managed catalogs. */
export function catalogKind(kind: string) {
  switch (kind) {
    case "task-types":
      return {
        list: () => db.taskType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { sidekickTasks: true, jobs: true } } } }),
        create: (f: Fields) => db.taskType.create({ data: { name: f.name!, slug: f.slug!, description: f.description, icon: f.icon, sortOrder: f.sortOrder ?? 0 } }),
        update: (id: string, f: Fields) => db.taskType.update({ where: { id }, data: f }),
        remove: async (id: string) => {
          const inUse = (await db.job.count({ where: { taskTypeId: id } })) + (await db.wantedAd.count({ where: { taskTypeId: id } })) + (await db.recurringSeries.count({ where: { taskTypeId: id } }));
          if (inUse) throw badRequest("This task type has job history — deactivate it instead");
          await db.taskType.delete({ where: { id } });
        },
      };
    case "skills":
      return {
        list: () => db.skill.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { sidekicks: true } } } }),
        create: (f: Fields) => db.skill.create({ data: { name: f.name! } }),
        update: (id: string, f: Fields) => db.skill.update({ where: { id }, data: { name: f.name, active: f.active } }),
        remove: async (id: string) => void (await db.skill.delete({ where: { id } })),
      };
    case "tools":
      return {
        list: () => db.tool.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { sidekicks: true } } } }),
        create: (f: Fields) => db.tool.create({ data: { name: f.name! } }),
        update: (id: string, f: Fields) => db.tool.update({ where: { id }, data: { name: f.name, active: f.active } }),
        remove: async (id: string) => void (await db.tool.delete({ where: { id } })),
      };
    default:
      throw notFound("Unknown catalog");
  }
}
