/**
 * @file Easy Tour Buggy System — Respawn Trigger (teleport to SpawnPointGizmo)
 * @author 2ndLife Rich — HumAi LLC
 * © 2025 HumAi LLC — MIT License. SPDX-License-Identifier: MIT
 *
 * @overview
 * Teleports entering players to a designated `SpawnPointGizmo`.
 *
 * @props
 * - `respawnPoint: Entity` (required)  A `SpawnPointGizmo` to send players to
 *
 * @usage
 * Attach to a Trigger Gizmo placed anywhere you want players to be returned to spawn.
 */

import { Component, PropTypes, CodeBlockEvents, SpawnPointGizmo } from 'horizon/core';

class RespawnTrigger extends Component<typeof RespawnTrigger> {
  static propsDefinition = {
    // Use default: undefined to mark this as a required property that must be set
    respawnPoint: { type: PropTypes.Entity, default: undefined }, 
  };

  start() {
    // Connect to the trigger's OnPlayerEnterTrigger event
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, (player) => {
      // The ! operator tells TypeScript we're certain this prop will be defined
      const spawnPoint = this.props.respawnPoint!.as(SpawnPointGizmo);
      spawnPoint.teleportPlayer(player);
    });
  }
}

Component.register(RespawnTrigger);