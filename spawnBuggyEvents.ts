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