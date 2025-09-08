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