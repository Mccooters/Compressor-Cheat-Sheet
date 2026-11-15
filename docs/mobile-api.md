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

## Shared asset list

Every phone used to read the whole AroFlo asset list itself (about 3,100
assets, seven requests) once a day, plus an hourly "what changed" check. This
site now keeps one copy and the apps download it from here, so the AroFlo
calls no longer grow with the number of phones.

Needs AroFlo's older, signed API (`AROFLO_LEGACY_*`): only its list pages
carry the barcode, location and custom fields the apps show.

How the copy is kept up to date:

- **On request, at most every 10 minutes.** The first page of a
  `GET /api/assets` tops the copy up from AroFlo's "changed since" feed when
  the last top-up started more than 10 minutes ago. That is usually one
  AroFlo request, and none at all while no phone is asking. There is no
  10-minute timer.
- **`fresh=1`** tops up at once (unless one started in the last 5 seconds).
  A phone sends it after it has edited or created an asset, so its own change
  comes straight back.
- **The whole list is read again** (about eight requests, about two minutes)
  when the last full read is more than 6 hours old, with **`fresh=full`**
  (the app's pull to refresh), and daily by the scheduled register rebuild
  (`vercel.json`). The 6-hourly one runs after the phone has its answer, so
  nobody waits for it. A `fresh=full` request **does wait**: allow three
  minutes for its first page. Full reads never run side by side (at most one
  every 4 minutes); a `fresh=full` that arrives during one is answered from
  the copy as it stands. The "changed since" feed is not complete: it has
  missed an older asset that had just been given a barcode, and it doesn't
  count custom field or location edits as changes. A full read is what
  catches those, and assets deleted outright.
- The same reads feed the asset-tag register above, so there is still only
  one read of AroFlo.

Implementation: `src/lib/assets/assetList.ts`,
`src/lib/assets/assetListRefresh.ts`, `src/lib/assets/legacyRegister.ts`.

Same bearer token and error rules as the routes above.

### `GET /api/assets`

| Query | Meaning |
|---|---|
| `since` | ISO time. Only assets this site saw change after then, and `removed` is filled. Omit for the whole list. |
| `after` | The `next` value of the previous page. |
| `limit` | Rows per page, default 500, at most 1000. |
| `fresh` | `1` to top up from AroFlo first; `full` to read the whole list from AroFlo again first (see above). |

```jsonc
{
  "generatedAt": "2026-11-15T01:02:03.000Z", // this site's time when the page was read
  "syncedAt": "2026-11-15T00:58:41.000Z",    // when the copy was last topped up from AroFlo; null if never
  "fullSyncedAt": "2026-11-14T18:00:07.000Z", // when the whole list was last read from AroFlo
  "assets": [
    {
      // One row of the older API's Assets zone, exactly as AroFlo sends it
      // with join=location,customfields: assetid, assetname, serialnumber,
      // barcode, modelnumber, manufacturer, category, client, location,
      // customfields, archived, ...
      "assetid": "JCQqTyBQLFEgCg==",
      "assetname": "GA37 VSD"
    }
  ],
  "removed": ["JCQqTyBQLFEgDg=="], // asset IDs archived or deleted since `since`; first page only
  "next": "JCQqTyBQLFEgCg=="       // pass as `after` for the next page; null on the last
}
```

- `assets` holds current (non-archived) assets only, ordered by `assetid`.
  The IDs are the **older API's** asset IDs, the ones the apps key their
  lists by, not API v2 IDs.
- Read every page (`next` until null) before replacing or merging a saved
  copy.
- **`since` is compared with when this site saw the change**, which can be up
  to 10 minutes after the change was made in AroFlo. Ask with a time a few
  minutes before the last successful read (the iOS app uses 10 minutes), to
  cover a phone clock that is a little out.
- An asset re-read with nothing changed is not sent again.

| Status | Meaning |
|---|---|
| `200` | A page, as above |
| `400` JSON | `since` isn't a date |
| `503` JSON | The list hasn't been read from AroFlo in full yet (or the mobile API isn't configured). The request starts that read in the background, so it is usually ready a few minutes later. Read AroFlo directly meanwhile; never treat this as an empty list. |
| `500` JSON | The read failed |

If AroFlo can't be reached when a read is due, the stored copy is served as
it is, and `syncedAt` and `fullSyncedAt` show its age. A client that asked
with `fresh=full` must check `fullSyncedAt` is within a few minutes of
`generatedAt` (the iOS app allows 10) and read AroFlo itself if it isn't:
the full read may have failed, or another request may have been running it.
