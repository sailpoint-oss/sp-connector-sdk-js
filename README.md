# Connector SDK for JavaScript

## Overview

Connector SDK for JavaScript is a framework for developing a SaaS connector for IdentityNow.

## Getting Started

### Setup

Create a Node.js project and install SDK. We strongly recommend using
[TypeScript](https://www.typescriptlang.org/download) to take advantage of static type checking.

```bash
npm install @sailpoint/connector-sdk
```

#### Installing from Source

To install the SDK from GitHub:
```bash
npm install github:sailpoint/saas-connector-sdk-js#main
```

To install the SDK from local clone, run `npm pack` from SDK project, then run in target project:
```bash
npm install <path-to-sailpoint-connector-sdk-semver.tgz>
```

### Import

```typescript
import { createConnector } from '@sailpoint/connector-sdk'
```

### Usage

Initialize `Connector` object in index.ts/.js and export it to the module.

```typescript
// index.ts
import {
    Connector,
    Context,
    createConnector,
    readConfig,
    Response,
    StdAccountReadInput,
    StdAccountReadOutput
} from '@sailpoint/connector-sdk'

// Get connector source config
const config = readConfig()

export const connector: Connector = createConnector()
    .stdAccountRead((context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
        // TODO: Fetch account from source

        res.send({
            identity: 'john.doe',
            uuid: '1234',
            attributes: {
                email: 'john.doe@example.com',
            },
        })
    })
    .command('my:custom:command', (context, input, res) => {
        // TODO: implement me!
    })
```
### Secret scan commands

Handlers for `std:secret-scan:full` and `std:secret-scan:delta` receive a `ScanResponse` instead of a `Response`. It has
no `send()`: content is handed to the runtime's detection stage with `res.scan()` (text) and `res.scanFile()` (files),
and only findings leave the execution. Await every call; each resolves once the stream has taken the unit, which is how
backpressure reaches the fetch loop. Customizers are not applied to these commands.

Most connectors should let a `ScanSession` drive the scan (see below) and supply only enumeration and file downloads.
The lower-level calls look like this:

```typescript
export const connector: Connector = createConnector()
    .stdSecretScanDelta(async (context: Context, input: StdSecretScanDeltaInput, res: ScanResponse) => {
        for (const item of await fetchChangedItems(input)) {
            const result = await res.scan({
                unitId: `page:${item.id}:body`,
                location: { /* where the content came from, never the content itself */ },
                content: { encoding: 'utf8', text: item.body },
                mimeType: 'text/plain',
            })
            // result.accepted is false for a unit that was skipped; count it as skipped.
        }
        res.saveState({ v: 1, targets: { /* cursor per scan target */ } })
    })
```

Text is sent with `encoding: 'utf8'`. `scan()` splits text larger than `maxUnitBytes` into overlapping chunks, one at a
time; every frame's `sizeBytes` is the UTF-8 byte length of that frame's own text. Every frame carries
`content.kind`: `text` for text, `file` for a file. Set `kind: 'file'` yourself for text that is a file's content.

#### Locations

`location` says where a unit came from, in terms that fit any source: `type` (a connector-defined kind of location),
`source`, `scanTarget`, `recordType` and `recordId` (the type and id of the item holding the content), `field` (where in
the item), and optionally `displayId` (a readable name; `recordId` is shown without it), `url`, `container`,
`visibility`, `owner` and `modifiedAt`. Strings are truncated to the findings schema's limits before they are sent
(`type` and `source` 64 characters, `recordType` 256, `recordId`, `displayId` and `container` 1024, `url` and `field`
2048, `owner.value` 512). A location never carries content.

#### Files

A file (an attachment, an upload) is sent as its raw bytes with `res.scanFile(file, bytes)`, where `bytes` is a `Buffer`
or `Uint8Array`. The connector does not decode or extract it: the runtime detects the format and extracts the text
(archives, office documents, email, text in any character set), applying the command's `extraction` switches. The
bytes are base64-encoded straight from the buffer and sent as one frame. The runtime takes a file's name from the last
`/`-separated segment of `location.field`, so use a field that names the file, identifies it within its item and
contains no `#`, for example `files/<id>/<file name>`.

`allowFile(name, mimeType, sizeBytes, input.extraction, input.maxBlobBytes)` is the file policy, and `scanFile()`
applies it again to the bytes. Call it with the file's metadata **before** downloading, so files that would be dropped
are never fetched. It refuses, in this order:

- every file when the command's `extraction.files` is `false` (`unlicensed`);
- audio and video, by MIME type, or by extension when the MIME type is missing or generic, and files on the scanner's
  denylist (some image, icon and media formats, such as `.webp`, `.svg` and `.ico`) when both the extension and the
  MIME type are listed, or the one of the two that is known (`policySkipped`);
- PDFs and images unless the command's `extraction.pdf` or `extraction.ocr` is on (`pdfDisabled`, `ocrDisabled`);
- a file over `maxBlobBytes` (default 10 MiB, at most 11 MiB; `oversize`).

Every other file is downloaded and sent; the runtime applies the `documents` and `archives` switches.

```typescript
import { allowFile } from '@sailpoint/connector-sdk'

const decision = allowFile(file.name, file.contentType, file.sizeBytes, input.extraction, input.maxBlobBytes)
if (!decision.allow) {
    coverage.skipped[decision.reason]++ // don't download the file
} else {
    const result = await res.scanFile({ unitId, location, name: file.name, mimeType: file.contentType }, await download(file))
}
```

`scan()` also takes a file as `encoding: 'base64'` text, sent whole as one frame: it is refused as `oversize` over
`maxBlobBytes` and as `unlicensed` when `extraction.files` is `false`, but the other rules are only applied by
`allowFile` and `scanFile()`.

#### Scan sessions

`ScanSession` runs a scan over a connector's targets and keeps its state, so a connector supplies only two functions:

- `enumerate(target, since, resumeAfter, payload)`: the items of a target (records, pages, messages, files), in
  ascending `modifiedAt` order, each with an `id`, a `modifiedAt` (ISO 8601), optionally a change counter (`version`),
  its text `units` and its `files`. `since` is an inclusive lower bound on `modifiedAt`; `resumeAfter` is the item to
  resume right after. Throw when the target cannot be enumerated.
- `fetchFile(file, maxBytes)`: the bytes of a file the policy allows, as a buffer or a stream (read up to the limit), or
  `undefined` when it cannot be downloaded right now (deleted since it was listed, or access refused).

```typescript
import { ScanSession, ScanSource } from '@sailpoint/connector-sdk'

const source: ScanSource = {
    async *enumerate(target, since, resumeAfter) {
        for await (const page of listPages(target.id, since, resumeAfter)) { // ordered by (modified time, id)
            yield {
                id: page.id,
                modifiedAt: page.updatedAt,
                version: page.revision,
                units: [{ unitId: `page:${page.id}:body`, location: locationOf(page), content: { encoding: 'utf8', text: page.body }, mimeType: 'text/html' }],
                files: page.files.map((f) => ({ ref: f.id, unitId: `page:${page.id}:file:${f.id}`, location: fileLocationOf(page, f), name: f.name, mimeType: f.type, sizeBytes: f.size })),
            }
        }
    },
    fetchFile: async (file) => downloadFile(file.ref), // undefined when it is gone or not readable
}

connector.stdSecretScanDelta(async (context, input, res) => {
    await new ScanSession({ mode: 'delta', input, res, declaredTargets: ['pages', 'spaces'] }).run([{ id: 'pages' }], source)
})
```

The session:

- reads a target from its saved cursor less an overlap (5 minutes by default), to catch items committed late with an
  earlier time, and skips the items in that overlap it already scanned (its `seen` window) unless they changed: a
  different `version`, or, without one, a different `modifiedAt` or one at the saved cursor itself;
- saves as the cursor the newest `modifiedAt` it handled, never the clock of the machine the scan runs on: a target
  found empty is marked `empty` and read from the beginning next time;
- in a delta, starts a target without state from `lookbackDays` before now, or from the beginning;
- stops a delta at the first item boundary after `maxUnits` (or `shouldStop()`), and resumes there next time, starting
  with the target it stopped in;
- checks every file with `allowFile` before calling `fetchFile`, and counts what it skipped;
- in a full scan, fails if a target cannot be enumerated or a declared target is missing, and lists in `retainedScope`
  the targets it could not cover completely (PDFs or images while their extraction is off, a file it could not
  download), so their earlier findings are kept;
- keeps targets split into sub-targets found at run time (`{ id, children: () => listChildren() }`), each with its own
  cursor; a sub-target that no longer exists loses its state, and one that throws `ScanTargetUnavailableError` keeps its
  state in a delta and fails a full scan;
- checkpoints the state as it goes, sends keep-alives, and keeps the serialised state under 256 KiB by dropping the
  oldest `seen` entries first (those items are only scanned again).

The state it saves (and reads back from `input.state`) is:

```json
{
    "v": 1,
    "targets": {
        "pages": {
            "cursor": "2026-10-01T10:06:00Z",
            "seen": { "p-17": "2026-10-01T10:06:00Z#4" },
            "resumeAfter": { "cursor": "2026-10-01T10:06:00Z", "id": "p-17" },
            "payload": "connector data saved with the cursor"
        },
        "spaces": { "targets": { "space-a": { "cursor": "2026-10-01T09:00:00Z" } } },
        "drafts": { "empty": true, "lastFullScanAt": "2026-10-28T12:00:00.000Z" }
    },
    "coverage": { "unitsScanned": 120, "unitsChunked": 3, "skipped": { "pdfDisabled": 2 } },
    "retainedScope": ["pages"],
    "resumeTarget": "pages"
}
```

The pure functions behind it (`startPosition`, `isUnchanged`, `nextTargetState`, `seenWindow`, `boundState`,
`scanStateProblem`) are exported for connectors that drive their own loop and want the same envelope. Log item ids and
sub-target names only as `scanLogRef(value)`, a short hash.

### Logging

Use SDK provided logger to ensure log statements will include command execution context fields.
```typescript
import {logger} from '@sailpoint/connector-sdk'
```

### Examples

See complete examples in the [examples](examples) directory.

<br/>

## Connector Local Development with `spcx`

`spcx` provides:
- ability to execute the connector locally
- ability to invoke mock commands against locally-running connector for testing/debugging
- built-in TypeScript support, with watch run and inline source map

`spcx` starts up an HTTP server locally (default port=3000) that can be used to invoke a command against the connector.
`spcx` cleanly imports the connector module from specified file path at every request, so the server does not need to be
restarted after every code edit. Just start it up once and keep on using until you are done!

For connectors written in TypeScript, `spcx` automatically spawns a child process to execute
[`tsc`](https://www.typescriptlang.org/tsconfig) with `--watch` and `--inlineSourceMap` options, as well as
user-defined compiler options in the project's `tsconfig.json`.
`--watch` option prevents needing to manually recompile after code edit,
and `--inlineSourceMap` option allows debugger to function with breakpoints set in original TypeScript source.

```bash
$ spcx <connector-file-js> [port=3000]
```

`spcx` can also be run using npm script, e.g. `$ npm run dev`:

```json
{
  "scripts": {
    "dev": "spcx dist/index.js"
  }
}
```

--

To invoke a command, simply provide command's `type`, `input`, and connector `config`

Ex: `POST http://localhost:3000`
```json
{
  "type": "std:account:read",
  "input": {
    "identity": "john.doe"
  },
  "config": {
    "key": "value"
  }
}
```


## Contributing

### Building Source

- [Node.js >= 16.2.0](https://nodejs.org/en/download/releases/)

To build the SDK source (generates output in `dist` directory):
```bash
npm run build
```

To run unit tests:
```bash
npm run test
```

To run prettier to format code:
```bash
npm run prettier
```
