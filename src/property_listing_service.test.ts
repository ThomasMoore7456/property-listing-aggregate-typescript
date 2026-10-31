import assert from "node:assert/strict";
import { selectListing } from "./property_listing_service.ts";

const complete = selectListing({ sourceUrl: "https://example.test/one", address: "1 Learning Lane", rent: 1800, bedrooms: 2 });
assert.equal(complete?.inspectionReminder.dueInDays, 30);
assert.equal(complete?.tenantDocument.status, "requested");
assert.equal(selectListing({ sourceUrl: "https://example.test/two", rent: 1800, bedrooms: 2 }), null);
console.log("listing decision test passed");
