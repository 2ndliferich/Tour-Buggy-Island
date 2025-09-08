# Tour Buggy System Documentation

### System Overview

The system is designed to manage the lifecycle and movement of "Tour Buggies" in a virtual world. It's composed of two primary subsystems:

1.  **Spawning System**: Allows players to create and destroy buggies using a UI and trigger zones.
2.  **Movement System**: Controls the automated movement of the buggies along predefined paths using a series of triggers for guidance.

These systems are decoupled and communicate through a well-defined set of local and network events, making the architecture modular and easy to maintain.

---

### File-by-File Breakdown

Here is a detailed description of each script's role:

#### Spawning System

| File | Purpose |
| :--- | :--- |
| `spawnBuggyUI.ts` | **Handles the UI for spawning buggies.** It creates buttons for different buggy types (e.g., single-player, two-player). When a player interacts with the UI, this script spawns the selected buggy asset at a designated location. It also tracks all entities spawned by each player, which is crucial for cleanup. This script listens for network events to despawn assets and reports back the results. |
| `spawnBuggyTrigger.ts` | **Manages the despawning logic via a trigger volume.** When a player enters this trigger, the script broadcasts a network event to request the despawning of all assets associated with that player. It also handles automatic cleanup if a player leaves the world. It can be linked to a `TextGizmo` to provide visual feedback to the player (e.g., "Despawning..."). |
| `spawnBuggyEvents.ts` | **Defines the network events for the spawning system.** This file contains the definitions for `requestDespawnEvent` and `despawnResultEvent`, which allows the UI and trigger scripts to communicate without being directly linked. This is excellent for keeping the code modular. |

#### Movement System

| File | Purpose |
| :--- | :--- |
| `tourBuggy.ts` | **The core movement component for the buggies.** This script should be attached to the buggy entity itself. It controls the buggy's speed and direction based on events. It listens for `TourControlEvent` to start or stop moving and `TourPathEvent` to change its direction and orientation. The buggy can also be stopped by triggers with a specific tag. |
| `tourBuggyGuidance.ts` | **Provides path guidance to the buggies.** This script is attached to trigger volumes placed along the tour path. When a buggy enters one of these triggers, this script sends a `TourPathEvent` to tell the buggy which direction to travel and face next. It can also be configured to stop the buggy. |
| `tourBuggyUI.ts` | **A simple UI to start and stop the tour.** This component creates a toggle button that sends a `TourControlEvent` to either a specific buggy or all buggies, telling them to start or stop their movement. |
| `tourBuggyEvents.ts` | **Defines the local events for the movement system.** This includes the `TourControlEvent` (for starting/stopping) and the `TourPathEvent` (for path guidance), which enables communication between the UI, guidance triggers, and the buggies. |

#### Utility

| File | Purpose |
| :--- | :--- |
| `respawnTrigger.ts` | **A general-purpose respawn script.** When a player enters the trigger volume this script is attached to, it teleports them to a designated `SpawnPointGizmo`. This is a standalone utility and is not directly tied to the buggy system's logic. |

---

### How It All Works Together: A Scenario

1.  **Spawning a Buggy**:
    *   A player approaches the `spawnBuggyUI` panel and clicks the "Single Player Buggy" button.
    *   The `SpawnUI` script receives the click, spawns the buggy asset at its designated location, and stores the new buggy's entity ID in a map, associated with the player's ID.

2.  **Starting the Tour**:
    *   The player gets in the buggy and approaches the `tourBuggyUI`.
    *   They click the "Start Buggy" button.
    *   The `TourBuggyUI` script sends a `TourControlEvent` with the action `start`.
    *   The `TourBuggy` script on the buggy receives this event and sets its state to `running`.

3.  **Moving Along the Path**:
    *   The buggy starts moving forward. It soon enters a trigger volume that has a `GuidanceTrigger` script on it.
    *   This `GuidanceTrigger` sends a `TourPathEvent`, telling the buggy to change its direction (e.g., turn left).
    *   The `TourBuggy` script receives this and updates its movement vector, smoothly turning to follow the new path.
    *   This process repeats as the buggy moves from one guidance trigger to the next.

4.  **Despawning the Buggy**:
    *   After the tour, the player drives the buggy into a "despawn zone," which is a trigger volume with the `spawnBuggyTrigger` script.
    *   The `TriggerLogic` script detects the player and sends a `requestDespawnEvent` over the network with the player's ID.
    *   The `SpawnUI` script, which is always listening, receives this event. It looks up all the entities spawned by that player (including the buggy) and calls `world.deleteAsset()` on each one, removing them from the world.
    *   Finally, the `SpawnUI` sends back a `despawnResultEvent` to confirm that the assets were deleted.

This event-driven architecture makes the system robust and extensible. For example, you could easily add new types of buggies or create more complex tour paths without having to modify the core logic of the existing scripts.
