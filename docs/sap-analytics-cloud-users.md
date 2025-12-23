# SAP Analytics Cloud — Get User & Update User (SCIM) 

This document describes how to implement **Get User** and **Update User** for **SAP Analytics Cloud (SAC)** using the **SailPoint JS Connector SDK** standard account commands:

- **Get User** → `std:account:read`
- **Update User** → `std:account:update`

SAC exposes user provisioning via a **SCIM 2.0** API in most environments. This guide assumes you’re integrating with the **SCIM `/Users`** resource.

> Note: SAP cloud products and tenant configurations vary. Always validate the exact base URL, auth, and attribute support with your SAC tenant documentation/configuration.

---

## Concepts and field mapping

### IdentityNow ↔ SCIM mapping

When implementing SailPoint standard commands, it’s helpful to map the SDK’s model to SCIM:

| SDK concept | SDK field | SCIM field (Users) | Notes |
|---|---|---|---|
| Account identity | `identity` | `userName` | Use as the primary lookup key when possible |
| Account unique id | `uuid` | `id` | SCIM resource id |
| Disabled state | `disabled` | `active` | Convention: `disabled = !active` |
| Attributes | `attributes` | Various (e.g., `emails`, `name.givenName`) | Use your connector schema to define which SCIM attributes you surface |

### Recommended account schema attributes

Define your account schema so that attribute names line up with SCIM paths (or your own stable connector names that you translate to SCIM).

Common attributes to expose:

- `userName` (string) — typically also used as `identity`
- `active` (boolean) — map to SDK `disabled` as inverse
- `name.givenName`, `name.familyName` (strings)
- `displayName` (string)
- `emails` (array) — SCIM uses an array of objects (e.g., `{ value, type, primary }`)
- `phoneNumbers` (array)
- `locale`, `timeZone` (strings)
- `externalId` (string) — if you use an external correlation id

If your connector schema uses different names (e.g., `email` instead of `emails`), document and implement a translation layer.

---

## Authentication and base URL

SAC SCIM calls are typically made to:

- `https://<tenant-host>/api/v1/scim/Users`

Authentication is tenant-dependent; common patterns include:

- OAuth2 access token in `Authorization: Bearer <token>`
- Basic auth (less common; depends on tenant/security posture)

At runtime, your connector should receive whatever credential material you choose in `config` (e.g., token endpoint + client id/secret, or a pre-minted bearer token, etc.).

---

## Get User (SDK: `std:account:read`)

### Purpose

Fetch a single SAC user and return a normalized account object to IdentityNow.

### SDK input

`StdAccountReadInput` includes:

- `identity` (string) — the account identifier passed by IdentityNow
- `schema?` — optional schema metadata

### SCIM request patterns

Use one of these approaches:

#### Option A (preferred): filter by `userName`

`GET /Users?filter=userName%20eq%20%22john.doe%40example.com%22`

Notes:
- URL-encode spaces and quotes.
- SCIM filter results can be paginated; for a unique `userName` you should get `totalResults` 0 or 1.

#### Option B: fetch by SCIM id

`GET /Users/{id}`

Use this when IdentityNow stores the SCIM `id` as `uuid` and passes it back as the read identity (depending on your connector design).

### SCIM response fields to map

Given a SCIM user like:

```json
{
  "id": "b7b1c7f4-...",
  "userName": "john.doe@example.com",
  "active": true,
  "name": { "givenName": "John", "familyName": "Doe" },
  "displayName": "John Doe",
  "emails": [{ "value": "john.doe@example.com", "type": "work", "primary": true }]
}
```

Return:

- `identity`: `"john.doe@example.com"` (usually `userName`)
- `uuid`: `"b7b1c7f4-..."` (SCIM `id`)
- `disabled`: `false` (since `active=true`)
- `attributes`: include whatever attributes your schema defines (e.g., `displayName`, `name.givenName`, `emails`, etc.)

### Example handler skeleton

```ts
import type { Context, Response, StdAccountReadInput, StdAccountReadOutput } from '@sailpoint/connector-sdk'

export async function stdAccountRead(
  context: Context,
  input: StdAccountReadInput,
  res: Response<StdAccountReadOutput>
) {
  const userName = input.identity

  // 1) GET /Users?filter=userName eq "<userName>"
  // 2) Map SCIM -> SDK output

  res.send({
    identity: userName,
    uuid: 'scim-id-here',
    disabled: false,
    attributes: {
      userName,
      active: true,
      displayName: 'John Doe',
      // name: { givenName: 'John', familyName: 'Doe' }  // if your schema supports nested objects
      // emails: [{ value: userName, type: 'work', primary: true }]
    }
  })
}
```

### Error handling guidance

- `401 Unauthorized`: invalid/expired token; fail the command with an auth error
- `403 Forbidden`: caller lacks SAC permissions for SCIM; fail with a permissions error
- `404 Not Found`: if using `/Users/{id}`; translate to “account not found”
- Filter returns `totalResults=0`: translate to “account not found”
- Filter returns `totalResults>1`: treat as data integrity issue and fail (ambiguous identity)

---

## Update User (SDK: `std:account:update`)

### Purpose

Apply attribute-level changes to an existing SAC user.

The SDK provides a **change list** with an operation (`Add`/`Set`/`Remove`), an attribute name, and a value. For SAC SCIM, the most reliable approach is to translate these into a **SCIM PATCH** request.

### SDK input

`StdAccountUpdateInput` includes:

- `identity` (string): the user identifier (often `userName`)
- `changes`: array of `{ op, attribute, value, metadata? }`
- `schema?`: optional

### Recommended SCIM update flow

1. Resolve target SCIM `id` (if you don’t already have it) by calling **Get User** using `userName`.
2. Build a SCIM PATCH request:
   - `Set` → `replace`
   - `Add` → `add`
   - `Remove` → `remove`
3. `PATCH /Users/{id}`
4. Return an update output; include updated attributes if you fetched/received them, otherwise omit.

### SCIM PATCH format

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "replace", "path": "displayName", "value": "John Q. Doe" }
  ]
}
```

### Change mapping examples

#### Example A: set basic string attributes

SDK changes:

```json
{
  "identity": "john.doe@example.com",
  "changes": [
    { "op": "Set", "attribute": "displayName", "value": "John Q. Doe" },
    { "op": "Set", "attribute": "name.givenName", "value": "John" },
    { "op": "Set", "attribute": "name.familyName", "value": "Doe" }
  ]
}
```

SCIM PATCH operations:

- `replace displayName`
- `replace name.givenName`
- `replace name.familyName`

#### Example B: disable a user

If you expose `active` in your schema, treat disable as setting `active=false`:

SDK change:

```json
{ "op": "Set", "attribute": "active", "value": false }
```

SCIM PATCH:

- `replace active` → `false`

If IdentityNow expresses disablement via a `disabled` attribute in your schema, translate:

- `disabled=true` → `active=false`
- `disabled=false` → `active=true`

#### Example C: remove an attribute

SDK change:

```json
{ "op": "Remove", "attribute": "phoneNumbers" }
```

SCIM PATCH:

- `remove phoneNumbers`

> SCIM path semantics vary. Some tenants require a more specific path for multi-valued attributes (e.g., `phoneNumbers[type eq "work"]`). Only use advanced paths if you’ve validated SAC supports them.

#### Example D: update emails

SCIM `emails` is an array of complex objects. A safe pattern is to **replace the entire `emails` array**.

SDK change:

```json
{
  "op": "Set",
  "attribute": "emails",
  "value": [
    { "value": "john.doe@example.com", "type": "work", "primary": true }
  ]
}
```

SCIM PATCH:

- `replace emails` with the full array

### Example handler skeleton

```ts
import type { Context, Response, StdAccountUpdateInput, StdAccountUpdateOutput } from '@sailpoint/connector-sdk'
import { AttributeChangeOp } from '@sailpoint/connector-sdk'

export async function stdAccountUpdate(
  context: Context,
  input: StdAccountUpdateInput,
  res: Response<StdAccountUpdateOutput>
) {
  // 1) Resolve SCIM id for input.identity (userName)
  // 2) Build SCIM PatchOp from input.changes
  // 3) PATCH /Users/{id}

  // Minimal output is acceptable if the update succeeded.
  res.send({
    identity: input.identity,
    results: input.changes.map((c) => ({
      attribute: c.attribute,
      success: true,
      message: `${c.op} applied`
    }))
  })
}
```

### Error handling guidance

Common SCIM errors to handle:

- `400 Bad Request`: invalid patch path/value; return per-attribute failures in `results` when possible
- `401 Unauthorized`: invalid/expired credentials
- `403 Forbidden`: insufficient permissions
- `404 Not Found`: user does not exist (stale identity/uuid)
- `409 Conflict`: uniqueness constraints (e.g., userName/email conflicts)
- `429 Too Many Requests`: backoff/retry according to your connector’s policy

---

## Local testing with `spcx`

### Get User

```json
{
  "type": "std:account:read",
  "input": { "identity": "john.doe@example.com" },
  "config": {
    "baseUrl": "https://<tenant-host>",
    "accessToken": "<bearer token>"
  }
}
```

### Update User

```json
{
  "type": "std:account:update",
  "input": {
    "identity": "john.doe@example.com",
    "changes": [
      { "op": "Set", "attribute": "displayName", "value": "John Q. Doe" },
      { "op": "Set", "attribute": "active", "value": false }
    ]
  },
  "config": {
    "baseUrl": "https://<tenant-host>",
    "accessToken": "<bearer token>"
  }
}
```

---

## Implementation tips (practical)

- Prefer **PATCH** over **PUT**: you avoid needing to re-send the entire SCIM user resource.
- Be explicit about your connector’s schema and supported attribute paths; reject changes you cannot safely map.
- If you support multi-valued complex attributes (like `emails`), prefer **replace-whole-array** unless you’ve validated SAC supports SCIM filter paths for partial updates.
- Normalize booleans: treat `active` as the source of truth; compute `disabled` as its inverse for SDK outputs.

