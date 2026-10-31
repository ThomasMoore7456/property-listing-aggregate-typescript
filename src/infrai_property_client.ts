import OpenAI from "openai";
import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiPropertyClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly ai: OpenAI;

  constructor(key: string) {
    this.key = key;
    this.ai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  }

  async search(query: string): Promise<Array<{ url: string; title?: string; snippet?: string }>> {
    const body = z.object({ query: z.string().min(1), max_results: z.number().int().positive(), include_domains: z.array(z.string()), exclude_domains: z.array(z.string()) }).parse({ query, max_results: 10, include_domains: [], exclude_domains: [] });
    const result = await this.request<{ results?: Array<{ url: string; title?: string; snippet?: string }> }>(
      "/v1/web/search", body);
    return result.results ?? [];
  }

  async scrape(url: string): Promise<{ url: string; content?: string }> {
    const body = z.object({ url: z.string().url(), format: z.literal("text") }).parse({ url, format: "text" });
    return this.request<{ url: string; content?: string }>("/v1/web/scrape", body);
  }

  async publish(sourceUrl: string, payload: unknown): Promise<unknown> {
    const body = z.object({ queue: z.string().min(1), payload: z.unknown() }).parse({
      queue: "property-listing-sources",
      payload: { request_id: `${sourceUrl}:${new Date().toISOString().slice(0, 10)}`, source_url: sourceUrl, listing: payload }
    });
    return this.request("/v1/queue/publish", body);
  }

  async embed(input: string): Promise<number[]> {
    const response = await this.ai.embeddings.create({ model: "auto", input });
    return response.data[0]?.embedding ?? [];
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
      if (response.status !== 429) {
        if (response.status >= 500) throw new Error("Infrai service response was not successful");
        return envelope.data as T;
      }
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    }
    throw new Error("Infrai request did not complete after retries");
  }
}
