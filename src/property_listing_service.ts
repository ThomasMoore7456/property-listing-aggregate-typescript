import { InfraiPropertyClient } from "./infrai_property_client.ts";

export type PropertyListing = {
  sourceUrl: string;
  address: string;
  rent: number;
  bedrooms: number;
  maintenanceRequest: { summary: string; priority: "normal" };
  tenantDocument: { name: string; status: "requested" };
  inspectionReminder: { dueInDays: number };
};

export function selectListing(candidate: Partial<PropertyListing>): PropertyListing | null {
  if (!candidate.sourceUrl || !candidate.address || typeof candidate.rent !== "number" || typeof candidate.bedrooms !== "number") return null;
  return {
    sourceUrl: candidate.sourceUrl,
    address: candidate.address,
    rent: candidate.rent,
    bedrooms: candidate.bedrooms,
    maintenanceRequest: { summary: `Prepare maintenance intake for ${candidate.address}`, priority: "normal" },
    tenantDocument: { name: "proof-of-income", status: "requested" },
    inspectionReminder: { dueInDays: 30 }
  };
}

export async function aggregatePropertyListings(query: string): Promise<PropertyListing[]> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the service");
  const client = new InfraiPropertyClient(key);
  const sources = await client.search(query);
  const selected: PropertyListing[] = [];
  for (const source of sources) {
    const page = await client.scrape(source.url);
    const candidate = parseListing(source.url, page.content ?? source.snippet ?? "");
    const listing = selectListing(candidate);
    if (listing) {
      selected.push(listing);
      await client.publish(source.url, listing);
    }
  }
  return selected;
}

function parseListing(sourceUrl: string, text: string): Partial<PropertyListing> {
  const rent = Number(text.match(/\$([0-9,]+)/)?.[1]?.replace(",", ""));
  const bedrooms = Number(text.match(/(\d+)\s*(?:bed|bedroom)/i)?.[1]);
  const address = text.match(/(?:at|address:)\s+([^.;]+)/i)?.[1]?.trim();
  return { sourceUrl, address, rent, bedrooms };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv.slice(2).join(" ") || "rental homes with maintenance details";
  aggregatePropertyListings(query).then((listings) => console.log(JSON.stringify(listings, null, 2)));
}
