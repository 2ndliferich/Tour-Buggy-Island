# Coastline Canvas Tour — Hover Buggy & Gallery System (Horizon Worlds)

**Created by 2ndLife Rich — HumAi LLC (LuxeVR Club)**
© HumAi LLC. You are free to use this system in your world with attribution: **“Tour Buggy System by HumAi LLC (LuxeVR Club)”**.

---

## What this is

A drop‑in **tour buggy + outdoor gallery** system for Horizon Worlds. World creators can spawn a hover buggy, start/stop the tour with a single UI button, and guide its route using simple **Guidance Triggers**—no scripting required after wiring the provided components.

**Primary use cases**

* Island/gallery tours (art frames around a coastline or campus)
* Scenic loops (pool → courtyard → overlook → docks)
* Any rail‑guided ride where designers want control via placed triggers

---

## Feature highlights

* **One‑tap spawn** UI for 1/2/4‑seat hover buggies
* **Broadcast or targeted control** of any buggy instance
* **Trigger‑driven pathing** using human‑readable axes (`x`, `-z`, `0,1,0`, etc.)
* **Stop zones** via tag or explicit trigger flag
* Clean, modular **local + network event** architecture
* Optional utilities: **Despawn Trigger**, **Respawn Trigger**, **Crown Falls Fountain** (animated water streams)

---

## Package contents (scripts)

### Spawning system

* **`spawnBuggyUI.ts`** — VR‑friendly panel to spawn 1/2/4‑seat buggies at defined locations; tracks player‑owned spawns and handles networked despawn responses.
* **`spawnBuggyTrigger.ts`** — Trigger that requests despawn of a player’s spawned assets (with optional TextGizmo feedback).
* **`spawnBuggyEvents.ts`** — Network events: `requestDespawnEvent` and `despawnResultEvent`.

### Movement system

* **`tourBuggy.ts`** — Movement component for the buggy (speed, local axis; responds to Start/Stop and Path events; supports stop‑tagged triggers).
* **`tourBuggyUI.ts`** — Big friendly **Start/Stop** button (target a specific buggy or broadcast to all).
* **`tourBuggyGuidance.ts`** — Drop on trigger gizmos to set **travel direction** and optional **facing**, or to **Stop** on entry.
* **`tourBuggyEvents.ts`** — Local events: `TourControlEvent` (start/stop) and `TourPathEvent` (travel/facing/stop; optional target).

### Utility

* **`respawnTrigger.ts`** — Teleport players to a designated `SpawnPointGizmo` when they enter the trigger.
* **`crownFallsFountain.ts`** — Spins water stream meshes around their **world‑space center** with per‑stream speed, axis, and reverse; optional ambient audio.

---

## Quick start (5–10 minutes)

1. **Place a Buggy prefab** (or an empty entity that will *become* the buggy root) and attach **`tourBuggy.ts`**.

   * Props: `speed` (u/s), `axis` (default `z`), `stopTriggerTag` (default `"stop"`), optional `moveEntity` (if the mover isn’t the same as the script’s entity).

2. **Add a Tour control UI**: Create a Custom UI Gizmo and attach **`tourBuggyUI.ts`**.

   * Props: `startLabel` / `stopLabel`, `startRunning` (optional), and **`buggy`** (link the buggy entity to target just that one, or leave empty to broadcast to all buggies).

3. **Build the path with Guidance Triggers**: Drop trigger gizmos along the route; attach **`tourBuggyGuidance.ts`**.

   * Props:

     * `stop` (bool): if set, entering the trigger **stops** the buggy
     * `travelAxis` (string): direction in world space (e.g., `x`, `-z`, `0,1,0`, `1 0 1`)
     * `faceAxis` (string, optional): world‑space facing; defaults to `travelAxis` if omitted
   * Tips: Place a trigger **slightly ahead** of a turn; use shorter distances for tighter curves.

4. **(Optional) Stop zones via tag**: If you prefer tag‑based stop volumes, tag any trigger gizmo with the value you set in `tourBuggy.ts → stopTriggerTag` (default `stop`). When the buggy enters, it halts.

5. **Spawner panel (optional but recommended)**: Create a UI Gizmo and attach **`spawnBuggyUI.ts`**.

   * Wire any of these asset/location pairs:

     * `buggySinglePlayer` + `buggyLocationSinglePlayer`
     * `buggyTwoPlayer` + `buggyLocationTwoPlayer`
     * `buggyFourPlayer` + `buggyLocationFourPlayer`
   * The UI will spawn at the given locations or in front of the player if none are provided. Spawns are tracked per‑player for cleanup.

6. **Creator‑facing Despawn Trigger**: Place a trigger gizmo at your return area/garage and attach **`spawnBuggyTrigger.ts`**.

   * Props: `spawnUI` (**required**) → reference the entity with `spawnBuggyUI.ts`.
   * Optional: `despawnTextGizmo` → link a TextGizmo to show status (e.g., “Despawning Buggy…” → “Done”).

7. **(Optional) Respawn**: Add **`respawnTrigger.ts`** to any volume that should teleport players to a `SpawnPointGizmo`.

8. **(Optional) Crown Falls Fountain**: Attach **`crownFallsFountain.ts`** to your fountain controller entity and wire props for each stream: entity, speed, reverse; choose per‑stream axis (`x|y|z`).

---

## Properties & events (creator reference)

### `tourBuggy.ts` (attach to buggy root)

* **Props**

  * `moveEntity: Entity` — mover target; defaults to this entity
  * `speed: number` — units per second (default **3**)
  * `axis: string` — local movement axis when not using path events (default **`"z"`**). Accepts `x`, `-y`, `0,1,0`, etc.
  * `stopTriggerTag: string` — tag that marks stop volumes (default **`"stop"`**)
* **Listens**

  * `TourControlEvent { action: 'start'|'stop', targetEntityId? }`
  * `TourPathEvent { travelAxis: string, faceAxis?: string, stop?: boolean, targetEntityId?: bigint }`
* **Behavior**

  * On **start**: records initial transform, begins kinematic motion
  * On **stop**: halts motion and resets to initial transform
  * On **path**: aligns facing to `faceAxis` (or `travelAxis`) and moves along that world axis

### `tourBuggyUI.ts` (attach to Custom UI Gizmo)

* **Props**: `startRunning`, `startLabel`, `stopLabel`, `buggy` (optional target)
* **Sends**: `TourControlEvent` (start/stop) — targeted if `buggy` set; otherwise broadcast

### `tourBuggyGuidance.ts` (attach to trigger gizmos)

* **Props**

  * `stop: boolean` — send stop event on enter
  * `travelAxis: string` — world‑space travel direction
  * `faceAxis?: string` — world‑space facing (optional)
* **Sends**

  * `TourControlEvent` (when `stop=true`), targeted to the entering entity when available
  * `TourPathEvent` (`travelAxis`, optional `faceAxis`), targeted or broadcast depending on trigger mode

### `spawnBuggyUI.ts` (attach to Custom UI Gizmo)

* **Asset props**: `buggySinglePlayer`, `buggyTwoPlayer`, `buggyFourPlayer`
* **Location props**: `buggyLocationSinglePlayer`, `buggyLocationTwoPlayer`, `buggyLocationFourPlayer`
* Tracks spawned entities **per player** and handles despawn **network responses**.

### `spawnBuggyTrigger.ts` (attach to trigger gizmo)

* **Props**: `spawnUI` (**required**), `despawnTextGizmo` (optional)
* **Behavior**: on player enter (or world exit), sends `requestDespawnEvent { playerId }`; updates TextGizmo on `despawnResultEvent`.

### `respawnTrigger.ts`

* Teleports players to a designated `SpawnPointGizmo` when they enter the trigger.

### `crownFallsFountain.ts` (optional add‑on)

* **Per stream**: `waterStream*`, `*_speed`, `*_reverse`, per‑stream axis (`x|y|z`)
* Spins around **world‑space center** for smooth UV flow illusion; optional ambient audio.

---

## Design guidance & best practices

* **Tight turns**: place multiple small Guidance Triggers a few meters apart and vary `faceAxis` slightly to smooth rotations.
* **Handoffs**: put a **Stop** trigger where riders disembark; pair with a **Despawn Trigger** at the garage/return zone.
* **Multiple buggies**: use multiple `tourBuggyUI.ts` panels targeted to specific buggies *or* a single broadcast panel for all.
* **Performance**: keep buggy meshes lightweight; avoid excessive physics; use baked lighting/screenspace where possible.
* **Testing**: verify stop tag volumes and trigger sizes; test with 1/2/4‑seat prefabs and confirm spawn points are clear.

---

## Submission‑ready descriptions

**Short (≤150 chars)**
A drop‑in hover‑buggy tour and outdoor gallery system for Horizon Worlds—spawn, start/stop, and guide routes with simple triggers.

**Long (≈500 chars)**
Coastline Canvas Tour is a creator‑friendly hover‑buggy system for Horizon Worlds. Spawn 1/2/4‑seat buggies, start/stop rides with a single UI tap, and guide the route using placeable Guidance Triggers—no scripting required. Perfect for island galleries and scenic loops, it supports stop zones by tag or flag, per‑buggy or broadcast control, and clean local/network events. Includes utilities for despawn, respawn, and an optional Crown Falls fountain effect. Built by HumAi LLC (LuxeVR Club).

---

## Credit / Licensing

**Credit requirement**: If you use this system (in part or whole), add a visible credit in your world description or an in‑world sign/panel:

> *“Tour Buggy System by HumAi LLC (LuxeVR Club)”*

**Copyright**: © HumAi LLC. All rights reserved. You may modify the scripts for your world(s). Redistribution as a standalone asset requires keeping this credit intact.

**Contact**: HumAi LLC — LuxeVR Club
Site: [https://luxevr.club](https://luxevr.club)
Business: [https://humai.llc](https://humai.llc)

---

## Changelog

**v1.0** — Initial public submission for the Creator Competition: core tour buggy, spawn/despawn, guidance triggers, utilities, fountain.
