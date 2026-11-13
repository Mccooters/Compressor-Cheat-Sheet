# Mobile sync API

Two read-only routes that let the Air Assist iOS app work offline. The app
downloads the whole reference library once, stores it on the device, and
renders every screen from that local copy — the network is only ever used to
refresh it.

**The app decodes this strictly.** A renamed field, an unexpected `null`, or
a changed date format fails the entire sync, not just one row. Treat the
shapes below as a contract: if you change a route, change this file and the
app together, and bump `schemaVersion` when the change isn't backwards
compatible.

- Implementation: `src/app/api/snapshot/route.ts`,
  `src/app/api/documents/[kind]/[id]/route.ts`
- Shared helpers: `src/lib/mobile/`
- Current `schemaVersion`: **2**

---

## Authentication

Both routes require a shared bearer token:

```
Authorization: Bearer <MOBILE_API_TOKEN>
```

| Condition | Response |
|---|---|
| `MOBILE_API_TOKEN` unset on the server | `503` JSON |
| Header missing, malformed, or wrong | `401` JSON |

The comparison is constant-time (`crypto.timingSafeEqual`). The routes never
fall open: an unconfigured server refuses rather than serving the library
unauthenticated.

Both paths are excluded from the auth redirect in `middleware.ts`. That
matters — the middleware answers unauthenticated requests with a `302` to
`/login`, and the app reads an HTML body as a failed sync. **Every response
from these routes is JSON or a file body; never HTML, never a redirect.**

---

## `GET /api/snapshot`

Returns the entire library as one JSON document.

Conventions throughout:

- Fields marked `| null` are nullable. Everything else is always present.
- **Arrays are always present, possibly empty — never `null`.**
- Dates are ISO 8601 strings.

```jsonc
{
  "schemaVersion": 2,
  "generatedAt": "2026-11-06T04:21:09.123Z",
  "equipment": [ /* Equipment */ ],
  "controllers": [ /* Controller */ ],
  "faultTrees": [ /* FaultTree */ ],
  "resources": [ /* Resource */ ]
}
```

### Equipment

Only `status = 'active'` rows, ordered by manufacturer then model number
(matching `listEquipment()`'s default sort).

```jsonc
{
  "id": "uuid",
  "type": "compressor",              // equipment_type enum
  "manufacturer": "Atlas Copco",
  "modelNumber": "GA 22",
  "displayName": "Atlas Copco GA 22",
  "details": "string | null",        // equipment.description
  "specs":           [{ "label": "Horsepower", "value": "30 hp" }],
  "performance":     [{ "label": "Motor power", "value": "22 kW" }],
  "pressureOptions": [{
    "workingPressureMpa": "0.75",
    "maxPressureMpa": "string | null",
    "capacityLs": "50",
    "capacityCfm": "106"
  }],
  "controllerIds": ["uuid"],         // equipment_controller
  "documents": [ /* Document */ ]
}
```

### Controller

All controllers, ordered by manufacturer then model name.

```jsonc
{
  "id": "uuid",
  "manufacturer": "Atlas Copco",
  "modelName": "Elektronikon",
  "displayName": "Atlas Copco Elektronikon",
  "notes": "string | null",
  "passwords":  [{ "id": "uuid", "label": "Service", "value": "8899" }],
  "faultCodes": [{ "id": "uuid", "code": "E:0119", "detail": "..." }],
  "equipmentIds": ["uuid"],          // active equipment only
  "documents": [ /* Document */ ]
}
```

`passwords` and `faultCodes` are ordered by `sortOrder`. `detail` is
`controller_fault_code.description` — renamed because `description` collides
awkwardly in Swift.

### FaultTree

Only `status = 'published'` trees, ordered by title.

```jsonc
{
  "id": "uuid",
  "title": "Compressor won't start",
  "summary": "string | null",        // fault_tree.description
  "category": "electrical",          // fault_tree_category enum
  "equipmentScope": "generic",       // generic | type_scoped | model_scoped
  "scopedEquipmentType": "string | null",
  "equipmentIds": ["uuid"],          // fault_tree_equipment
  "rootNodeId": "uuid | null",
  "nodes": [{
    "id": "uuid",
    "nodeType": "question",          // question | diagnosis
    "prompt": "Is the display lit?",
    "probableCause":  "string | null",
    "recommendedFix": "string | null",
    "safetyWarning":  "string | null",
    "linkedEquipmentId": "uuid | null",
    "linkedDocumentId": "uuid | null",
    "branches": [{ "id": "uuid", "label": "Yes", "toNodeId": "uuid" }]
  }]
}
```

Nodes are ordered by `createdAt` and branches by `sortOrder` — the same order
`getTreeWithNodes()` uses, so the app walks a tree exactly as the website's
wizard does.

### Resource

The `resource` table (ordered by title), followed by `pvi_resource` rows
(ordered by `createdAt`).

```jsonc
{
  "id": "uuid",
  "area": "swms",   // swms | breathing_air | installations | pressure_vessel_inspection
  "title": "Working at heights",
  "category": "other",
  "webUrl": "https://...",
  "browserUrl": "string | null",
  "fileName": "string | null"
}
```

`pvi_resource` has no `area` column — those rows are always emitted as
`pressure_vessel_inspection`, with `category` taken from the row.

### Document

```jsonc
{
  "id": "uuid",
  "title": "Instruction manual",
  "docType": "manual",               // document_type enum
  "webUrl": "https://...",
  "browserUrl": "string | null",
  "fileName": "string | null",
  "lastModifiedAt": "ISO string | null"
}
```

### Equipment display rules

`specs` and `performance` are pre-formatted server-side so the app shows
exactly what the website shows. The rules live in `src/lib/mobile/specs.ts`,
which mirrors `src/app/equipment/[id]/page.tsx` — **change them together.**

- **`specs`** — the fields declared in `specFieldsByType[type]`, in schema
  order, skipping `undefined` and `""`. Value is
  `` `${String(v)}${unit ? ` ${unit}` : ""}` ``. Select values are emitted
  raw (`"rotary_screw"`), because the website does not humanise them. Keys
  present in the blob but not declared for the type are omitted, as the page
  only iterates declared fields.
- **`performance`** — `[]` unless the page's `hasData` check passes
  (`outlet || weightKg || dimensionsMm || motorPowerKw || noiseLevelDba ||
  refrigerant || capacityLmin || maxPressureBar || pressureOptions`). Then,
  in page order, each key where the value is not `undefined`: Motor power
  (kW), Noise level (dBA), Port size, Recommended pipe, Weight (kg),
  Dimensions (mm), Refrigerant, Power supply, Max pressure (bar), Max flow
  (L/min), Max flow (m³/h).
- **`pressureOptions`** — from `specs.pressureOptions`, stringified; `null`
  where the source value is `undefined` or `null`.

A field can legitimately appear in **both** `specs` and `performance` — a
dryer's `weightKg`, for instance, is both a declared dryer spec and a
performance-grid entry. The website renders it twice too.

### URL rewriting

SharePoint is unreachable from the phone, which has no Microsoft session, so
SharePoint-backed rows are rewritten to point at our own proxy.

A row is proxied when either:

- `source = 'graph'` with both `sharepointDriveId` and `sharepointItemId`, or
- `source = 'manual_link'` and the stored URL's host ends with
  `.sharepoint.com`.

Then:

| Field | Value |
|---|---|
| `webUrl` | `{origin}/api/documents/{kind}/{id}` |
| `browserUrl` | the original stored URL |

`kind` is `document` (`document_link`), `resource` (`resource`) or `pvi`
(`pvi_resource`). For `document` only, when `lastModifiedAt` is set, a
`?v=<ISO timestamp>` query is appended — the app compares it against its
cached copy to decide whether to re-download.

Any other link is passed through unchanged with `browserUrl: null`.

---

## `GET /api/documents/{kind}/{id}`

Streams a SharePoint-backed document, fetched with **app-only** Graph
credentials (`src/lib/graph/appClient.ts`) rather than a user session. See
the application-permissions section of `docs/azure-ad-setup.md` — without
that consent, this route fails while the rest of the sync still works.

- `kind` — `document` | `resource` | `pvi`
- Office formats (`doc(x)`, `xls(x)`, `ppt(x)`, `rtf`, `odt`, …) are
  converted to PDF via Graph's `?format=pdf`. PDFs, images and everything
  else stream through unchanged with their own content type.
- Pasted SharePoint links are resolved through `/shares/u!{base64url}/driveItem`.
- The body is streamed, not buffered.

Response headers:

| Header | Value |
|---|---|
| `Content-Type` | `application/pdf` when converted, else the item's MIME type |
| `Content-Disposition` | `attachment; filename="<ascii>"; filename*=UTF-8''<encoded>` |
| `Cache-Control` | `private, no-store` |

**The filename carries the correct extension** (`.pdf` when converted) — the
app takes the file's extension from this header.

Errors:

| Status | When |
|---|---|
| `401` / `503` | auth, as above |
| `404` | unknown `kind`, unknown `id`, or a row that isn't SharePoint-backed |
| `502` | Graph returned the document unsuccessfully |
| `500` | anything else |

A row that isn't SharePoint-backed returns `404` rather than redirecting to
its original URL: the app cannot follow a redirect here, and would read the
response as a failed download. The snapshot never points at this route for
such rows.

---

## Asset-tag register

QR stickers on equipment carry a tag ID — `AAC-{3-letter type}-{4 digits}`,
e.g. `AAC-CMP-0002`. A tag is registered when an AroFlo asset has that ID in
its **Barcode** field. AroFlo's v2 API cannot search by barcode, so the
website keeps a register (table `asset_tag`) and apps read it rather than
each searching AroFlo.

The register is refreshed once a day on a schedule (`vercel.json`), and on
demand whenever an unknown tag is looked up, at most once every few minutes.

- With AroFlo's older, signed API configured (`AROFLO_LEGACY_*`), the daily
  run rebuilds the whole register from asset list pages, which include the
  barcode (~7 requests), and on-demand top-ups read only changed assets.
- Without it, both use the v2 "assets changed since" feed and open each
  changed asset in turn.

Implementation: `src/lib/assets/tagIndex.ts`, `src/lib/assets/legacyRegister.ts`.

Same bearer token and error rules as the routes above.

### `GET /api/asset-tags`

```jsonc
{
  "generatedAt": "2026-11-13T22:02:27.808Z",
  "tags": [
    {
      "tagId": "AAC-CMP-0002",         // uppercase, no spaces
      "arofloAssetId": "BRDG000ASSR",  // AroFlo API v2 encoded ID — never a legacy ID
      "name": "string | null",
      "serialNumber": "string | null",
      "clientName": "string | null",
      "updatedAt": "ISO string"        // when the register last wrote this entry
    }
  ]
}
```

`tags` is always present, possibly empty, ordered by `tagId`. No `ETag` is
sent.

### `GET /api/asset-tags/{tagId}`

`tagId` is normalised first (whitespace stripped, uppercased).

| Status | Meaning |
|---|---|
| `200` | One entry, same shape as an item of `tags` |
| `404` JSON | No asset carries this tag, or the ID isn't a valid tag |
| `502` JSON | The lookup itself failed — **not** "unregistered" |

### Rules

- **Duplicates.** If two AroFlo assets carry the same tag, the one edited
  most recently wins, and the clash is logged.
- **Stale entries.** If an asset's barcode is changed or cleared in AroFlo,
  its old tag is dropped the next time the register reads that asset.
- `name`, `serialNumber` and `clientName` are copies for offline display.
  The live AroFlo record is the source of truth.
