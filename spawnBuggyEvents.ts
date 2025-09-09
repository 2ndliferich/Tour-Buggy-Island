import { NetworkEvent } from 'horizon/core';

/**
 * Network Events for Asset Spawning System
 * 
 * This file defines the network events used for communication between the SpawnUI 
 * and TriggerLogic components in the asset spawning system.
 */

/**
 * Event triggered to request despawning of assets for a specific player
 * Payload:
 * - playerId: The unique identifier of the player whose assets should be despawned
 */
export const requestDespawnEvent = new NetworkEvent<{playerId: number}>('requestDespawn');

/**
 * Event triggered in response to a despawn request with the operation results
 * Payload:
 * - playerId: The unique identifier of the player whose assets were despawned
 * - count: Number of successfully despawned entities
 * - failedCount: Number of entities that failed to despawn
 */
export const despawnResultEvent = new NetworkEvent<{
	playerId: number, 
	count: number, 
	failedCount: number
}>('despawnResult');

/**
 * Event to request despawning of a specific spawned asset GROUP by groupId.
 * This allows a trigger that is configured for "Objects Tagged" to despawn only the
 * buggy that entered the zone (not all of the player's spawns).
 */
export const requestDespawnGroupEvent = new NetworkEvent<{ groupId: string }>('requestDespawnGroup');

/**
 * Event to request despawning by a specific entity id. The receiver should resolve
 * the entity's group (if any) and despawn that whole group; if no group is found,
 * just delete the entity itself.
 */
export const requestDespawnByEntityEvent = new NetworkEvent<{ entityId: bigint }>('requestDespawnByEntity');

/**
 * Optional result event for group/entity despawns (for diagnostics/UI text gizmos).
 */
export const despawnByKeyResultEvent = new NetworkEvent<{ 
    key: string, // "group:<id>" or "entity:<id>"
    count: number,
    failedCount: number
}>('despawnByKeyResult');

