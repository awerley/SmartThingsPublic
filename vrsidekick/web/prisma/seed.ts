import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TASK_TYPES: [string, string, string][] = [
  ["Turnover Cleaning", "🧹", "Clean and reset the rental between guest stays"],
  ["Laundry & Linens", "🧺", "Wash, dry, fold and replace linens and towels"],
  ["Restocking Supplies", "🧻", "Restock toiletries, paper goods, coffee and consumables"],
  ["Property Inspection", "🔍", "Walk-through, damage check and photo report"],
  ["Lawn Mowing", "🌱", "Mow, edge and blow lawn areas"],
  ["Landscaping", "🌳", "Trimming, mulching, planting and yard cleanup"],
  ["Pool & Hot Tub Service", "🏊", "Chemical balance, skimming, filter cleaning"],
  ["Handyman Repairs", "🔧", "General repairs, furniture assembly, small fixes"],
  ["Plumbing", "🚿", "Leaks, clogs, fixtures and water heaters"],
  ["Electrical", "⚡", "Outlets, lighting, fixtures and troubleshooting"],
  ["HVAC", "❄️", "Filter changes, maintenance and repairs"],
  ["Pest Control", "🐜", "Inspection and treatment"],
  ["Trash Bin Service", "🗑️", "Take bins to the curb and back on pickup day"],
  ["Guest Check-in / Key Exchange", "🔑", "Meet guests, hand off keys, answer questions"],
  ["Window Washing", "🪟", "Interior and exterior windows"],
  ["Carpet & Upholstery Cleaning", "🛋️", "Deep clean carpets, rugs and furniture"],
  ["Snow Removal", "❄️", "Driveway, walkways and steps"],
  ["Photography", "📷", "Listing photos and virtual tours"],
];

const SKILLS = [
  "Deep cleaning", "Hotel-style bed making", "Staging & presentation", "Minor plumbing", "Minor electrical",
  "Licensed electrician", "Licensed plumber", "CPO pool certification", "Smart lock setup", "Appliance repair",
  "Drywall & paint", "Carpentry", "Pressure washing", "Bilingual (Spanish)", "Inventory management",
];

const TOOLS = [
  "Commercial vacuum", "Steam cleaner", "Carpet extractor", "Riding mower", "Push mower", "String trimmer",
  "Leaf blower", "Pressure washer", "Ladder (extension)", "Power drill / driver", "Pool test kit",
  "Pickup truck", "Snow blower", "Drone", "Washer & dryer (off-site laundry)",
];

// Seed ZIP centroids so the demo works without calling the geocoding API.
const ZIPS = [
  { zip: "32541", lat: 30.3935, lng: -86.4958, city: "Destin", state: "FL" },
  { zip: "32550", lat: 30.3832, lng: -86.3524, city: "Miramar Beach", state: "FL" },
  { zip: "32459", lat: 30.3577, lng: -86.2294, city: "Santa Rosa Beach", state: "FL" },
  { zip: "32548", lat: 30.4058, lng: -86.6189, city: "Fort Walton Beach", state: "FL" },
  { zip: "32413", lat: 30.3148, lng: -85.9102, city: "Panama City Beach", state: "FL" },
];

async function main() {
  await db.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  for (const z of ZIPS) await db.zipGeo.upsert({ where: { zip: z.zip }, update: z, create: z });

  for (const [i, [name, icon, description]] of TASK_TYPES.entries()) {
    await db.taskType.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), icon, description, sortOrder: i } });
  }
  for (const name of SKILLS) await db.skill.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of TOOLS) await db.tool.upsert({ where: { name }, update: {}, create: { name } });

  const passwordHash = await bcrypt.hash("password123", 10);
  await db.user.upsert({
    where: { email: "admin@vrsidekick.test" },
    update: {},
    create: { email: "admin@vrsidekick.test", name: "VR Sidekick Admin", role: "ADMIN", passwordHash },
  });
  const host = await db.user.upsert({
    where: { email: "host@vrsidekick.test" },
    update: {},
    create: { email: "host@vrsidekick.test", name: "Hannah Host", role: "HOST", passwordHash, hasPaymentMethod: true },
  });
  if (!(await db.property.count({ where: { hostId: host.id } }))) {
    await db.property.create({
      data: { hostId: host.id, name: "Seaside Cottage", address: "123 Gulf Shore Dr", city: "Destin", state: "FL", zip: "32541", lat: 30.3935, lng: -86.4958, notes: "Lockbox code in app. Trash day is Tuesday." },
    });
  }

  const types = Object.fromEntries((await db.taskType.findMany()).map((t) => [t.name, t.id]));
  const skills = Object.fromEntries((await db.skill.findMany()).map((t) => [t.name, t.id]));
  const tools = Object.fromEntries((await db.tool.findMany()).map((t) => [t.name, t.id]));
  const weekdays = (start: number, end: number, days = [1, 2, 3, 4, 5]) => days.map((d) => ({ dayOfWeek: d, startMinute: start * 60, endMinute: end * 60 }));

  const demo = [
    {
      email: "sam@vrsidekick.test", name: "Sam Rivera", providerType: "INDIVIDUAL" as const, zip: "32550",
      bio: "Turnover specialist with 6 years cleaning beach rentals. Fast, photo-documented turnovers.",
      tasks: [["Turnover Cleaning", "FLAT", 12000], ["Laundry & Linens", "HOURLY", 3000], ["Restocking Supplies", "HOURLY", 2800], ["Property Inspection", "FLAT", 5000]] as const,
      skills: ["Deep cleaning", "Hotel-style bed making", "Staging & presentation", "Bilingual (Spanish)"],
      tools: ["Commercial vacuum", "Steam cleaner", "Washer & dryer (off-site laundry)"],
      rules: weekdays(9, 17, [1, 2, 3, 4, 5, 6, 7]),
    },
    {
      email: "greenwave@vrsidekick.test", name: "Marcus Lee", company: "Green Wave Lawn & Pool", providerType: "COMPANY" as const, zip: "32541",
      bio: "Locally owned lawn and pool company serving the Emerald Coast. Insured, uniformed crews.",
      tasks: [["Lawn Mowing", "FLAT", 6500], ["Landscaping", "HOURLY", 5500], ["Pool & Hot Tub Service", "FLAT", 9000], ["Trash Bin Service", "FLAT", 2000]] as const,
      skills: ["CPO pool certification", "Pressure washing"],
      tools: ["Riding mower", "String trimmer", "Leaf blower", "Pool test kit", "Pickup truck", "Pressure washer"],
      rules: weekdays(7, 15),
    },
    {
      email: "fixit@vrsidekick.test", name: "Dana Brooks", providerType: "INDIVIDUAL" as const, zip: "32459",
      bio: "Handy with just about anything — repairs, smart locks, paint touch-ups and appliance fixes.",
      tasks: [["Handyman Repairs", "HOURLY", 6500], ["Electrical", "HOURLY", 8500], ["Guest Check-in / Key Exchange", "FLAT", 3500]] as const,
      skills: ["Minor plumbing", "Minor electrical", "Smart lock setup", "Drywall & paint", "Carpentry", "Appliance repair"],
      tools: ["Power drill / driver", "Ladder (extension)", "Pickup truck"],
      rules: weekdays(8, 18, [1, 2, 3, 4, 5, 6]),
    },
  ];
  for (const d of demo) {
    if (await db.user.findUnique({ where: { email: d.email } })) continue;
    const z = ZIPS.find((x) => x.zip === d.zip)!;
    await db.user.create({
      data: {
        email: d.email, name: d.name, role: "SIDEKICK", passwordHash,
        sidekick: {
          create: {
            providerType: d.providerType,
            displayName: "company" in d && d.company ? d.company : d.name,
            companyName: "company" in d ? d.company : null,
            bio: d.bio, insured: d.providerType === "COMPANY", yearsExperience: 6,
            baseZip: d.zip, baseLat: z.lat, baseLng: z.lng, serviceRadiusMiles: 25, serviceZips: [d.zip],
            timezone: "America/Chicago", payoutsEnabled: true,
            tasks: { create: d.tasks.map(([t, rateType, rateCents]) => ({ taskTypeId: types[t], rateType, rateCents })) },
            skills: { create: d.skills.map((s) => ({ skillId: skills[s] })) },
            tools: { create: d.tools.map((t) => ({ toolId: tools[t] })) },
            rules: { create: d.rules },
          },
        },
      },
    });
  }

  if (!(await db.wantedAd.count())) {
    const prop = await db.property.findFirstOrThrow({ where: { hostId: host.id } });
    await db.wantedAd.create({
      data: {
        hostId: host.id, propertyId: prop.id, taskTypeId: types["Turnover Cleaning"], title: "Saturday turnover cleaner needed",
        description: "3BR/2BA cottage, ~10 turnovers a month in season. Looking for a reliable cleaner who can handle Saturday 10am–3pm windows.",
        zip: "32541", lat: 30.3935, lng: -86.4958, budgetCents: 13000, rateType: "FLAT", recurring: true, frequency: "WEEKLY",
      },
    });
  }
  console.log("Seeded. Logins (password123): admin@vrsidekick.test, host@vrsidekick.test, sam@vrsidekick.test, greenwave@vrsidekick.test, fixit@vrsidekick.test");
}

main().finally(() => db.$disconnect());
