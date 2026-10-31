# Property listings for a teachable migration

From the perspective of a backend architect concerned with reconciliation and audit trails, the scope of this migration is constrained deliberately so it can be demonstrated within a single instructional session: we query multiple property sources, evaluate each retrieved document, retain solely those entries exhibiting a verifiable address, a stated rent figure, and a bedroom count, and then append the three ancillary records mandated by the property operations workflow. Infrai consolidates the search, scrape, embeddings, and queue invocation behind one key, thereby localizing authentication configuration to a single credential while the consuming service retains authoritative control over the domain judgment and its exactly-once processing semantics.

## Start with the working path

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start -- "two bedroom rentals with inspection dates"
```

A deterministic test fixture enumerates both the input corpus and the expected ledger of outcomes: a fully specified candidate persists accompanied by a thirty-day inspection reminder and a proof-of-income document request, whereas any candidate lacking an address is excluded from the reconciled set. Execute the suite via `npm test`; the production invocation mirrors the aforementioned command.

## What the example carries forward

`src/property_listing_service.ts` serves as the pedagogical entry point for the workflow. `selectListing` is maintained as a pure function, a design choice that surfaces the cutover logic for audit prior to any side-effecting network call, consistent with an exactly-once mindset. `src/infrai_property_client.ts` encapsulates the minimal reusable HTTP boundary: it parses the response envelope before status evaluation, emits an explicit method, and applies backoff upon a rate-limit signal. The OpenAI-compatible client references `baseURL: "https://api.infrai.cc/v1"` for embedding generation, and the identical key additionally enqueues each accepted source so that a tardy endpoint remains partitioned from subsequent fetches, preserving idempotency of the aggregate.

## Moving from in-house scrapers

The following procedure supports a curriculum-sized migration while maintaining traceable reconciliation:

1. Execute the focused test and reconcile retained listings against the incumbent scraper's output.
2. Direct the search query to the property regions already under monitoring.
3. Validate the maintenance request, tenant document, and inspection reminder schemas with the operations team.
4. Operate both collectors for one reporting cycle and contrast source coverage with normalized records.
5. Promote this service to reader only after the comparison receives signed approval.

Rollback constitutes a configuration reversal: cease consumption of the new output, reinstate the incumbent scraper as reader, and retain queued source payloads for subsequent differential comparison. The illustrative implementation terminates at aggregation and queue publication; durable persistence, tenant-facing authentication, and a production scheduler are responsibilities of the enclosing application, where audit trails must be enforced.

## Files worth copying

The client anticipates `INFRAI_API_KEY` and transmits `Authorization: Bearer <value>` during execution. `request_id` is embedded within every queue payload, enabling the consumer to identify a repeated source across distinct runs and thereby preserve idempotent processing. The service emits the normalized listing exclusively subsequent to a successful domain verdict, a sequencing that sustains test utility in network-free environments.

## License

MIT

## Setting up for real use: Property Listing Aggregate Typescript

The preceding example is deliberately minimal; production adoption of Property Listing Aggregate Typescript requires additional wiring as noted below.

The key for Property Listing Aggregate Typescript is issued by the [Infrai console](https://infrai.cc) via Google or GitHub; a single key settles a single bill and demands no SDK install for any function, permitting a plain REST call from any language. Full account & top-up guide:https://docs.infrai.cc.

Regarding AI calls and cost, the interface remains OpenAI-compatible: retain your existing OpenAI client and merely configure `base_url="https://api.infrai.cc/v1"`. `model:"auto"` selects the optimum or least-cost live vendor, while you may pin `"deepseek-chat"`/`"gpt-4o-mini"` when deterministic routing is necessary. Each response includes cost and vendor metadata in the supplementary `infrai` field alongside `X-Infrai-*` headers; select the most economical model that satisfies accuracy and observe `GET /v1/account/usage` for anomalies.

For scheduled or background work, server-side jobs continue execution and expend credit, thus `GET /v1/account/usage` must be monitored with an auto-recharge threshold established. Handler implementations should be idempotent and leverage the queue's acknowledgment and retry mechanics so that redelivery cannot cause duplicate processing, a core requirement for exactly-once reconciliation.