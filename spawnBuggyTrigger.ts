import { Component, PropTypes, Player, TextGizmo, CodeBlockEvents } from 'horizon/core';
import { requestDespawnEvent, despawnResultEvent } from './spawnBuggyEvents';

/**
 * TriggerLogic Component
 * 
 * Handles player interactions with trigger zones and manages the despawning of assets.
 * This component works in conjunction with SpawnUI to manage the lifecycle of spawned assets.
 * 
 * Key Features:
 * - Monitors player entry/exit from trigger zones
 * - Handles player world exit events
 * - Updates UI feedback through TextGizmo
 * - Manages network communication for despawn operations
 */
export class TriggerLogic extends Component<typeof TriggerLogic> {  
  /**
   * Component Properties
   * @property despawnTextGizmo - Optional TextGizmo for displaying despawn status
   * @property spawnUI - Required reference to the SpawnUI component
   */
  static propsDefinition = {
    despawnTextGizmo: { type: PropTypes.Entity },
    spawnUI: { type: PropTypes.Entity, required: true }
  };

  /** Flag to prevent multiple dispose calls */
  private isDisposed = false;

  /** Stores the original text of the despawn gizmo */
  private originalGizmoText = "";

  /**
   * Component Initialization
   * Sets up event listeners for:
   * - Player world exit
   * - Trigger zone entry/exit
   * - Despawn result handling
   */
  start() {
    console.log('TriggerLogic component starting');

    // Ensure the entity is correctly set up to send network events
    if (!this.entity) {
        console.error("TriggerLogic entity is not defined");
        return;
    }

    // Store the original text of the gizmo
    const textGizmo = this.props.despawnTextGizmo?.as(TextGizmo);
    if (textGizmo) {
      this.originalGizmoText = textGizmo.text.get();
    }

    // Handle player world exit
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, (player: Player) => {
      const playerId = player.id;
      const playerName = player.name.get() || 'Unknown Player';
      console.log(`Player ${playerName} (ID: ${playerId}) left world - initiating despawn`);
      this.sendNetworkBroadcastEvent(requestDespawnEvent, { playerId });
    });

    // Handle despawn operation results
    this.connectNetworkEvent(this.entity, despawnResultEvent, (data) => {
      const textGizmo = this.props.despawnTextGizmo?.as(TextGizmo);
      if (textGizmo) {
        const message = `Player ${data.playerId}: Despawned ${data.count} entities, ${data.failedCount} failed`;
        textGizmo.text.set(message);
        console.log(`Updated TextGizmo: ${message}`);
      }
    });

    
    // Handle player trigger zone entry
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterTrigger, async (player: Player) => {
      const playerId = player.id;
      const playerName = player.name.get() || 'Unknown Player';

      console.log(`Player ${playerName} (ID: ${playerId}) entered trigger zone`);

      // Set the gizmo text to indicate despawning is in progress
      const textGizmo = this.props.despawnTextGizmo?.as(TextGizmo);
      if (textGizmo) {
        textGizmo.text.set("Despawning Buggy");
      }

      console.log(`Sending despawn request for player ${playerId}`);
      this.sendNetworkBroadcastEvent(requestDespawnEvent, { playerId });
      console.log(`Despawn request sent for player ${playerId}`);
    });

    // Handle player trigger zone exit
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitTrigger, (player: Player) => {
      const playerName = player.name.get() || 'Unknown Player';
      console.log(`Player ${playerName} exited trigger zone`);
      
      // Reset TextGizmo to default state
      const textGizmo = this.props.despawnTextGizmo?.as(TextGizmo);
      if (textGizmo) {
        textGizmo.text.set(this.originalGizmoText);
        console.log('Reset TextGizmo to original state');
      }
    });
  }

  /**
   * Component Cleanup
   * Handles proper disposal of resources and event listeners
   */
  async dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    
    console.log('TriggerLogic component disposing');
    
    super.dispose();

    // Clear TextGizmo on disposal
    const textGizmo = this.props.despawnTextGizmo?.as(TextGizmo);
    if (textGizmo) {
      textGizmo.text.set("");
    }
  }
}

Component.register(TriggerLogic);