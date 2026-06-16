# Copilot Studio Livestreaming — Verification Report

> Prepared for the Copilot Studio product team. This document records **facts only**: the verification method, the client environment, the raw activity observations, and a neutral analysis of the data. It intentionally draws **no conclusions** about root cause.

## 1. Purpose

Verify whether agents authored in Microsoft Copilot Studio emit **livestreaming** (progressive/interim) activities over Direct Line, as described in the BotFramework-WebChat livestreaming contract:
https://github.com/microsoft/BotFramework-WebChat/blob/main/docs/LIVESTREAMING.md

Per that contract, a livestream is expected to surface as:
- Interim `typing` activities carrying `text` plus streaming metadata (`streamType: "streaming"`, incrementing `streamSequence`, a `streamId`), with metadata in either `channelData` or `entities[type="streaminfo"]`.
- A terminating `message` activity (`streamType: "final"`).

## 2. Client environment

| Item | Value |
|------|-------|
| Client | Custom web chat (MCSChat), Direct Line 3.0 JS SDK |
| Transport | WebSocket (`webSocket: true`) |
| Direct Line domain | `https://directline.botframework.com/v3/directline` |
| Channel | Direct Line (Web Socket) — a channel listed as livestreaming-capable in the contract |
| Activity ID returned by service | Yes (observed, e.g. `...|0000004`) |

The client subscribes to the Direct Line `activity$` observable and logs every inbound bot activity, including the **raw** `channelData` and `entities` fields (not a parsed/derived view).

## 3. Verification method

1. Connect to the agent over Direct Line WebSocket.
2. Subscribe directly to the raw `directLine.activity$` stream (bypassing all client-side parsing) and record, per bot activity: `type`, `id`, `text` length, `channelData`, `entities`, `replyToId`, `inputHint`, `timestamp`.
3. Send a user message expected to elicit a long, generated response.
4. Capture the full ordered sequence of bot activities from user-send to final message.
5. Repeat across three different agent types in the same environment.

Environment under test (preview): `copilotstudio.preview.microsoft.com`, environment IDs `efcd2d46-...` and `448464af-...`.

## 4. Agents tested

| # | Agent | Authoring style | Result observed |
|---|-------|-----------------|-----------------|
| A | IVA / topic-driven | Topics | Single complete `message`; `typing` carried no metadata |
| B | "Storyteller" (魏晋风骨) | Instructions-only, generative | Single complete `message` (501 chars); `typing` carried no metadata |
| C | "UniversalStudio Campus" | Generative answers + knowledge source (RAG) | Single complete `message` (1335 chars) after ~34s; multiple `typing`, none carried metadata |

All three agents have **generative orchestration = Yes** where applicable. Agent C additionally uses a knowledge source and returns grounded citations.

## 5. Key raw activity observations

### 5.1 Agent C (generative answers + knowledge) — representative sequence

User message: `什么时候开园` ("when does the park open"), sent at `2026-06-13T01:11:33.011Z`.

Inbound bot activities, in order:

```
type=typing  id=...|LmJWYAuHgB3  text=undefined  replyToId=...|0000003  streamId=undefined  streamType=undefined  streamSequence=undefined
type=typing  id=...|JFMO03hQ0Gu  text=undefined  replyToId=undefined    streamId=undefined  streamType=undefined  streamSequence=undefined
type=typing  id=...|BeAMHrBEYPe  text=undefined  ...
type=typing  id=...|EiTgfsao60v  text=undefined  ...
type=typing  id=...|GqDZt7nXHmT  text=undefined  ...
type=typing  id=...|DFyUm4r1IJO  text=undefined  ...
type=typing  id=...|Dc9ifCOtxjQ  text=undefined  ...
type=typing  id=...|9ZaEzDnju7a  text=undefined  ...
   ( client log: "Removing stuck progress indicator after 30 seconds" )
type=typing  id=...|HTKf2Y13gAt  text=undefined  ...
type=message id=...|0000004      textLength=1335  inputHint=acceptingInput  replyToId=...|0000003
             channelData={ feedbackLoop:{ type:"default" } }  entities=[]  hasStreamingMetadata=false
```

- Nine `typing` activities preceded the message. Every one had `text=undefined` and no streaming metadata in either `channelData` or `entities`.
- The terminating `message` arrived at `2026-06-13T01:12:06.593Z`. Measured end-to-end response time: **33,896 ms**.
- The final `message` carried the full 1335-character answer in a single payload; `channelData` contained only `feedbackLoop`; `entities` was empty.

### 5.2 Agent B ("Storyteller") — representative sequence

User message requesting a long descriptive scene.

```
type=typing  id=...|7yfU8DShM2v  textLen=0  entities=[]  replyToId=...|0000003
type=typing  id=...|KzMxkjECT0Y  textLen=0  entities=[]
type=message id=...|0000004      textLen=501  inputHint=acceptingInput  replyToId=...|0000003
             channelData={ feedbackLoop:{ type:"default" } }  entities=[]
```

Measured response time: ~6.2 s (TTFT ~1.9 s). One complete `message`; no interim text; no streaming metadata.

### 5.3 Agent A (topic-driven) — representative sequence

```
type=typing  id=...|ILoV3irDVF5  text=undefined  replyToId=...|0000006  streamId=undefined  streamType=undefined  streamSequence=undefined  entities=[]
type=message id=...|0000005      textLength=112  inputHint=acceptingInput
```

One complete `message`; `typing` carried no metadata.

## 6. Aggregate observations across all runs

| Observation | Agent A | Agent B | Agent C |
|-------------|:-------:|:-------:|:-------:|
| Channel = Direct Line (WebSocket) | Yes | Yes | Yes |
| Service returned activity IDs | Yes | Yes | Yes |
| `typing` activities received | Yes | Yes | Yes (9) |
| Any `typing` with non-empty `text` | No | No | No |
| `channelData.streamType` present on any activity | No | No | No |
| `channelData.streamSequence` present on any activity | No | No | No |
| `channelData.streamId` present on any activity | No | No | No |
| `entities[type="streaminfo"]` present on any activity | No | No | No |
| Response delivered as a single `message` | Yes | Yes | Yes |
| Longest single-payload response | 112 chars | 501 chars | 1335 chars |
| Longest observed response time | ~1.5 s | ~6.2 s | ~33.9 s |

## 7. Copilot Studio agent settings inspected (Agent B)

From the agent's **Settings → Generative AI** page, the following options were present and recorded. No option labeled "streaming", "stream", or equivalent was found on this page.

| Section | Setting | State |
|---------|---------|-------|
| Orchestration | Use generative AI orchestration | Yes |
| Orchestration | Deep reasoning (preview) | Off |
| Connected agents | Let other agents connect | On |
| Model | Continue using retired Models | Off |
| Responses | Response formatting | (free text) |
| Moderation | Content moderation level | 3 |
| User Feedback | Collect user reactions | On |
| Knowledge | Allow ungrounded responses | On |
| Knowledge | Use information from the Web | On |
| File processing | File uploads | On |
| File processing | Code interpreter | Off |
| Search | Enhanced search results | — |
| Search | Tenant graph grounding with semantic search | Off |

## 8. Analysis (data-level, no conclusions)

- Across three agent authoring styles (topic-driven, instructions-only generative, generative-answers-with-knowledge) in the same preview environment, **no inbound activity carried any livestreaming metadata** in either `channelData` or `entities`.
- All `typing` activities observed were content-less (`text` undefined or length 0). Under the livestreaming contract, interim progressive text would be expected to appear on `typing` activities carrying `text` and `streamType: "streaming"`; none were observed.
- The presence of multiple content-less `typing` activities followed by a single full-text `message` is consistent with non-streaming delivery. The same pattern held for a 1335-character response with a ~34 s generation time.
- The client transport and channel satisfy the contract's stated client/channel prerequisites (Direct Line over WebSocket; service returns activity IDs). The absence of streaming metadata is therefore observed on the **inbound activity payloads themselves**, independent of client parsing.
- The Generative AI settings surface inspected for one agent did not expose a streaming-related toggle.

## 9. Open questions for the product team

1. For these agents/environment, is livestreaming expected to be active, and if so, what conditions gate it (tenant, region, ring, model, response length, feature rollout)?
2. Where, if anywhere, is livestreaming controlled — agent setting, environment policy, or automatic runtime behavior?
3. Is there a way to confirm whether the runtime serving these agents has the livestreaming capability enabled?

## 10. Reproduction data summary

- Client: Direct Line 3.0 JS over WebSocket, raw `activity$` subscription.
- Environment: `copilotstudio.preview.microsoft.com`, environments `efcd2d46-3d9e-e31a-a9d8-5481ddae951c` and `448464af-64af-ec92-a521-6d203cf6811d`.
- Date of capture: 2026-06-13 (UTC).
- Agents: IVA (topics), Storyteller (instructions, generative), UniversalStudio Campus (generative answers + knowledge).
- Representative activity IDs: `EbOmioRCspaUpzgdadE63-as|0000002`, `...|0000004`; `4zsjapBOuaGHwaDQLCyxRy-as|0000004`.

## 11. Addendum — Confirmed streaming payload from a working capture (2026-06-15)

A colleague captured a Bot Framework SDK trace (`dump.json`, 695 records) from an environment where livestreaming **is** active. This addendum records the facts from that capture; it confirms the on-the-wire shape that was absent in sections 1–10.

### 11.1 Activity composition

| Type | Count |
|------|-------|
| `typing` | 687 |
| `message` | 2 |
| `event` | 4 |

`streamType` distribution (in `channelData`): `informative` ×3, `streaming` ×682, `final` ×2, none ×7.

### 11.2 Session shape (one streaming answer)

```
informative (seq 1, streamId=null, id=c1b928bf… → becomes the session id)
informative (seq 2, streamId=c1b928bf…)  text="正在搜索知识来源..."
informative (seq 3, streamId=c1b928bf…)  text="正在分析数据..."
streaming   (seq 4..685, streamId=c1b928bf…)   ← 682 chunks, no gaps, no dups
message     (final, streamId=c1b928bf…)        ← full text + citations footer
```

- Stream metadata is carried in **`channelData`** (`streamType` / `streamId` / `streamSequence`); `entities` contains only a bare `{ "type": "streaminfo" }` marker with no payload.
- The greeting is a **separate session** (`streamId=f2d36cb9…`) delivered as a single `final` message with no streaming chunks.
- Interleaved `event` activities expose the tool-execution trace: `DynamicPlanReceived`, `DynamicPlanStepTriggered`, `DynamicPlanStepBindUpdate`, `DynamicPlanStepFinished`.

### 11.3 Chunk encoding — DELTA, not cumulative

- Each `streaming` chunk carries only the **new fragment** (≤10 chars), not the full text so far.
- The bot declares this **authoritatively** via `channelData.chunkType: "delta"` — present on all 682 streaming chunks. (Parsing should rely on this field, not on a prefix heuristic.)
- Concatenating the 682 fragments in `streamSequence` order reproduces the answer body (1,306 chars).
- The `final` message text (1,427 chars) equals the concatenated body **plus an appended citations footer** (`[1]: … "…"`, `[2]: cite:2 "Citation-2"`).
- `streamSequence` is strictly increasing 4→685 with **zero gaps and zero duplicates**.

### 11.3.1 Per-streamType channelData shape (verbatim from dump)

```
informative : { streamType:"informative", streamSequence:1 }                 text="正在生成计划..."
streaming   : { streamType:"streaming", streamId:"c1b928bf…", chunkType:"delta", streamSequence:4 }
final       : { streamType:"final", streamId:"f2d36cb9…", feedbackLoop:{type:"default"} }   type=message
```

`entities` carried only a bare `{ "type": "streaminfo" }` marker on every streaming/informative/final activity. The capture's `ChannelId.Channel` was `pva-published-engine-direct`.

### 11.4 Client impact (fixed)

The original `_handleStreamingChunk` assumed cumulative text and overwrote `entry.text` with each delta fragment, leaving only the last fragment. The accumulator was corrected to support both delta and cumulative encodings. An offline replay of the corrected logic over `dump.json` reconstructs the exact 1,427-char final text.

### 11.5 Note on the local environment

Sections 1–10 (local preview environment) still show **no** streaming metadata on any activity. The capture in this addendum comes from a **different environment** where streaming is enabled. The open questions in section 9 about what gates streaming per environment remain for the product team.
