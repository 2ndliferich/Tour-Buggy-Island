import { UIComponent, View, Text, Pressable, Binding, UINode } from 'horizon/ui';
import { Player, PropTypes, Asset, Vec3, Quaternion, Entity, HapticStrength, HapticSharpness } from 'horizon/core';
import { requestDespawnEvent, despawnResultEvent, requestDespawnGroupEvent, requestDespawnByEntityEvent, despawnByKeyResultEvent } from './spawnBuggyEvents';

/**
 * SpawnUI Component
 * 
 * A VR-friendly UI component that manages asset spawning and despawning functionality.
 * Provides visual feedback and haptic responses for user interactions.
 * 
 * @remarks
 * This component handles the complete lifecycle of spawned assets including:
 * - Asset spawning with position calculation
 * - Per-player entity tracking
 * - Network-synchronized despawn handling
 * - Haptic feedback for VR interactions
 * - Error handling and user feedback
 * 
 * @example
 * ```typescript
 * // Basic usage in world configuration
 * const spawnUI = SpawnUI.create({
 *   buggySinglePlayer: myAssetTemplate
 * });
 * ```
 */
export class SpawnUI extends UIComponent<typeof SpawnUI> {
    /**
     * Component Properties
     * @property buggySinglePlayer, buggyTwoPlayer, buggyFourPlayer - The asset templates to spawn when requested
     */
    static propsDefinition = {
        buggySinglePlayer: { type: PropTypes.Asset, required: false },
        buggyTwoPlayer: { type: PropTypes.Asset, required: false },
        buggyFourPlayer: { type: PropTypes.Asset, required: false },
        buggyLocationSinglePlayer: { type: PropTypes.Entity, required: false },
        buggyLocationTwoPlayer: { type: PropTypes.Entity, required: false },
        buggyLocationFourPlayer: { type: PropTypes.Entity, required: false }
    };

    /** 
     * Maps player IDs to their spawned entities for tracking and cleanup
     * @private
     */
    private spawnedEntities: Map<number, Entity[]> = new Map();
    /**
     * Track groups of spawned assets by a generated groupId so we can despawn
     * exactly one buggy even if its player is not present.
     */
    private groupEntities: Map<string, Entity[]> = new Map();
    private entityToGroup: Map<bigint, string> = new Map();

    /**
     * Tag to apply to spawned buggy entities so object-tag triggers can detect them.
     * Keep <=20 chars per tag (Horizon limit).
     */
    private buggyTag = 'buggy';

    /** Create a short group id (<=12 chars) suitable for tags like "gid:<id>" */
    private generateGroupId(): string {
        const n = Math.floor(Math.random() * 0xFFFFFFFF);
        return n.toString(36); // short base36 id
    }

    /** Attach runtime gameplay tags to each entity in a group */
    private tagSpawnGroup(entities: Entity[], gid: string) {
        for (const e of entities) {
            try {
                e.tags.add(this.buggyTag);
                const gidTag = `gid:${gid}`;
                // ensure tag <= 20 chars
                const safeTag = gidTag.length > 20 ? gidTag.slice(0, 20) : gidTag;
                e.tags.add(safeTag);
            } catch (err) {
                console.error('Failed to tag entity for group', gid, String(err));
            }
        }
    }

    /** Resolve a groupId from an entity's tags (fallback if local map is missing) */
    private groupIdFromEntityTags(entity: Entity): string | null {
        try {
            for (const t of entity.tags.get()) {
                if (t.startsWith('gid:')) {
                    return t.slice(4);
                }
            }
        } catch {}
        return null;
    }


    /** 
     * Height of the UI panel in pixels
     * @protected
     */
    protected panelHeight = 400;

    /** 
     * Width of the UI panel in pixels
     * @protected
     */
    protected panelWidth = 400;

    /** 
     * Binding for spawn button opacity
     * @private
     */
    private buttonOpacityBinding = new Binding<number>(1.0);

    /** 
     * Binding for spawn button text content
     * @private
     */
    private singlePlayerButtonText = new Binding<string>("Single Player Buggy");
    private twoPlayerButtonText = new Binding<string>("Two Player Buggy");
    private fourPlayerButtonText = new Binding<string>("Four Player Buggy");

    /** 
     * Binding for error message display
     * @private
     */
    private errorMessageBinding = new Binding<string>("");

    /**
     * Component Initialization
     * Sets up network event handlers for despawn requests and entity cleanup
     * 
     * @throws {Error} When entity is not properly initialized
     * @internal
     */
    start() {
        // Ensure the entity is correctly set up to receive network events
        if (!this.entity) {
            console.error("SpawnUI entity is not defined");
            return;
        }

        // Listen for spawn event responses
        this.connectNetworkBroadcastEvent(requestDespawnEvent, async (data: { playerId: number }) => {
            try {
                console.log(`Received despawn request for player ${data.playerId}`);
                const entities = this.getPlayerSpawnedEntities(data.playerId);

                // Immediately clear the entities for this player to prevent race conditions
                this.clearPlayerEntities(data.playerId);
                console.log(`Found ${entities.length} entities to despawn for player ${data.playerId}`);
                
                let despawnCount = 0;
                const failedEntities: Entity[] = [];

                // Process each entity
                for (const entity of entities) {
                    try {
                        if (!entity) {
                            console.log(`Skipping null/undefined entity for player ${data.playerId}`);
                            continue;
                        }

                        console.log(`Attempting to despawn entity for player ${data.playerId}`);
                        await this.world.deleteAsset(entity);
                        despawnCount++;
                        console.log(`Successfully despawned entity ${despawnCount}/${entities.length} for player ${data.playerId}`);

                    } catch (error) {
                        console.error(`Failed to delete entity for player ${data.playerId}: ${error}`);
                        failedEntities.push(entity);
                    }
                }

                // If any entities failed to despawn, add them back to the tracking map
                if (failedEntities.length > 0) {
                    this.spawnedEntities.set(data.playerId, failedEntities);
                    console.log(`Updated tracking with ${failedEntities.length} failed entities for player ${data.playerId}`);
                } else {
                    console.log(`All entities for player ${data.playerId} were successfully despawned.`);
                }

                // Send result back to TriggerLogic
                this.sendNetworkEvent(this.entity, despawnResultEvent, {
                    playerId: data.playerId,
                    count: despawnCount,
                    failedCount: failedEntities.length
                });
                console.log(`Sent despawn result event for player ${data.playerId}`);

            } catch (error) {
                console.error("Error processing despawn request:", error);
            }

        // === Despawn a single buggy by groupId (e.g., from a tagged object despawn zone) ===
        this.connectNetworkBroadcastEvent(requestDespawnGroupEvent, async (data: { groupId: string }) => {
            const { groupId } = data;
            const entities = this.groupEntities.get(groupId) ?? [];
            let success = 0;
            const failed: Entity[] = [];
            // Remove group from indexes first to avoid duplicate work
            this.groupEntities.delete(groupId);
            for (const e of entities) { this.entityToGroup.delete(e.id); }

            for (const entity of entities) {
                try {
                    await this.world.deleteAsset(entity);
                    success++;
                } catch (err) {
                    failed.push(entity);
                }
            }

            // Clean player-owned list: remove any entities we actually deleted
            this.spawnedEntities.forEach((list, pid) => {
                const remaining = list.filter(e => !entities.includes(e));
                if (remaining.length !== list.length) {
                    this.spawnedEntities.set(pid, remaining);
                }
            });

            this.sendNetworkBroadcastEvent(despawnByKeyResultEvent, {
                key: `group:${groupId}`,
                count: success,
                failedCount: failed.length
            });
        });

        // === Despawn by a specific entity ID (resolve its group, if any) ===
        this.connectNetworkBroadcastEvent(requestDespawnByEntityEvent, async (data: { entityId: bigint }) => {
            // First try local index
            const { entityId } = data;
            let gid = this.entityToGroup.get(entityId) || null;

            // Best-effort: if the entity still exists and has tags, read gid from tags
            if (!gid) {
                try {
                    const maybe = new Entity(entityId);
                    gid = this.groupIdFromEntityTags(maybe);
                } catch {}
            }

            if (gid) {
                // Delegate to the grouped logic
                this.sendNetworkBroadcastEvent(requestDespawnGroupEvent, { groupId: gid });
                return;
            }

            // No group found -> try to delete the single entity
            try {
                const entity = new Entity(entityId);
                await this.world.deleteAsset(entity);

                // Remove from any tracking lists
                this.spawnedEntities.forEach((list, pid) => {
                    this.spawnedEntities.set(pid, list.filter(e => e.id !== entityId));
                });
                this.sendNetworkBroadcastEvent(despawnByKeyResultEvent, { key: `entity:${String(entityId)}`, count: 1, failedCount: 0 });
            } catch (err) {
                this.sendNetworkBroadcastEvent(despawnByKeyResultEvent, { key: `entity:${String(entityId)}`, count: 0, failedCount: 1 });
            }
        });
        });
    }

    /**
     * Retrieves all entities spawned by a specific player
     * @param playerId - The ID of the player whose entities to retrieve
     * @returns {Entity[]} Array of entities spawned by the player, empty array if none found
     * @public
     */
    getPlayerSpawnedEntities(playerId: number): Entity[] {
        return this.spawnedEntities.get(playerId) || [];
    }

    /**
     * Removes all tracked entities for a specific player
     * @param playerId - The ID of the player whose entities to clear
     */
    clearPlayerEntities(playerId: number) {
        this.spawnedEntities.delete(playerId);
    }

    /**
     * Handles asset spawn requests from the UI
     * Includes position calculation, error handling, and UI feedback
     * 
     * @param player - The player requesting the spawn
     * @throws {Error} When asset spawning fails or no asset is configured
     * @private
     * @async
     */
    private async handleSpawnRequest(player: Player, buggy: Asset | null | undefined, buggyLocation: Entity | null | undefined) {
        try {
            if (!buggy) {
                console.error("No asset configured for spawning");
                this.errorMessageBinding.set("Error: No Asset Configured");
                return;
            }

            // Get spawn position from buggyLocation if provided, otherwise use player's position
            let spawnPosition: Vec3;
            let spawnRotation: Quaternion = Quaternion.one; // Default rotation
            
            if (buggyLocation) {
                // Use the position and rotation from the spawn location object
                spawnPosition = buggyLocation.position.get();
                spawnRotation = buggyLocation.rotation.get();
                console.log(`Using custom spawn location at ${JSON.stringify(spawnPosition)}`);
            } else {
                // Fallback to spawning in front of player
                spawnPosition = new Vec3(
                    player.position.get().x + player.forward.get().x * 2,
                    player.position.get().y + 1, // Slightly above ground
                    player.position.get().z + player.forward.get().z * 2
                );
                console.log('Using default player-relative spawn location');
            }

            // UI state is updated per button
            
            // Spawn the asset
            const entities = await this.world.spawnAsset(
                buggy,
                spawnPosition,
                spawnRotation,
                new Vec3(1, 1, 1) // Default scale
            );

            // Make all spawned entities visible
            for (const entity of entities) {
                entity.visible.set(true);
            }

            
            // Tag the spawned entities and record them as a group so object-tag triggers can despawn a single buggy
            const groupId = this.generateGroupId();
            this.tagSpawnGroup(entities, groupId);
            this.groupEntities.set(groupId, entities);
            for (const e of entities) {
                this.entityToGroup.set(e.id, groupId);
            }
// Track the spawned entities for this player
            const playerId = player.id;
            if (!this.spawnedEntities.has(playerId)) {
                this.spawnedEntities.set(playerId, []);
            }
            this.spawnedEntities.get(playerId)?.push(...entities);

            console.log(`Player ${player.name.get()} spawned ${entities.length} entities`);
            
            this.errorMessageBinding.set("");

        } catch (error) {
            console.error("Failed to spawn asset:", error);
            this.errorMessageBinding.set("Error spawning asset");
            
        }
    }

    /**
     * Initializes and returns the UI layout for the spawn panel
     * 
     * @remarks
     * Creates a panel with:
     * - Title text
     * - Error message display
     * - Interactive spawn button with haptic feedback
     * 
     * The UI includes visual feedback for hover states and error conditions,
     * as well as haptic feedback for VR interactions.
     * 
     * @returns {UINode} The root View node containing the complete UI layout
     * @override
     */
    initializeUI() {
        const children: UINode[] = [
            // Title text
            Text({
                text: "Tour Buggy Spawner",
                style: {
                    fontSize: 24,
                    color: "white",
                    fontFamily: "Roboto",
                    marginBottom: 20,
                    textAlign: "center"
                }
            }),

            // Error message text (only visible when there's an error)
            Text({
                text: this.errorMessageBinding,
                style: {
                    fontSize: 16,
                    color: "#FF4444",
                    fontFamily: "Roboto",
                    marginBottom: 10,
                    textAlign: "center"
                }
            }),

            // Single Player Buggy Button
            this.createSpawnButton("Single Player Buggy", this.singlePlayerButtonText, this.props.buggySinglePlayer, this.props.buggyLocationSinglePlayer),

            // Two Player Buggy Button
            this.createSpawnButton("Two Player Buggy", this.twoPlayerButtonText, this.props.buggyTwoPlayer, this.props.buggyLocationTwoPlayer),

            // Four Player Buggy Button
            this.createSpawnButton("Four Player Buggy", this.fourPlayerButtonText, this.props.buggyFourPlayer, this.props.buggyLocationFourPlayer),
        ];

        return View({
            children,
            style: {
                width: this.panelWidth,
                height: this.panelHeight,
                backgroundColor: "#000000AA",
                borderRadius: 15,
                padding: 20,
                justifyContent: "center",
                alignItems: "center"
            }
        });
    }

    /**
     * Creates a spawn button with a specific text and asset
     * @param textBinding The text binding for the button
     * @param asset The asset to spawn on click
     * @returns {UINode} A Pressable UI node
     * @private
     */
    private createSpawnButton(defaultText: string, textBinding: Binding<string>, buggy: Asset | null | undefined, buggyLocation: Entity | null | undefined): UINode {
        return Pressable({
            children: [
                Text({
                    text: textBinding,
                    style: {
                        fontSize: 20,
                        color: "white",
                        fontFamily: "Roboto",
                        textAlign: "center"
                    }
                })
            ],
            onEnter: (player) => {
                this.buttonOpacityBinding.set(0.8);
                player.rightHand.playHaptics(100, HapticStrength.Light, HapticSharpness.Sharp);
                player.leftHand.playHaptics(100, HapticStrength.Light, HapticSharpness.Sharp);
            },
            onExit: () => {
                this.buttonOpacityBinding.set(1.0);
            },
            onClick: async (player) => {
                player.rightHand.playHaptics(200, HapticStrength.Strong, HapticSharpness.Soft);
                player.leftHand.playHaptics(200, HapticStrength.Strong, HapticSharpness.Soft);

                textBinding.set("Spawning...");
                await this.handleSpawnRequest(player, buggy, buggyLocation);
                textBinding.set(defaultText);
            },
            style: {
                width: 300,
                height: 50,
                backgroundColor: "#4CAF50",
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                opacity: this.buttonOpacityBinding,
                marginBottom: 10
            }
        });
    }
}

UIComponent.register(SpawnUI);