
import { Component, PropTypes, Entity, TextGizmo, CodeBlockEvents } from 'horizon/core';
import { requestDespawnByEntityEvent, requestDespawnGroupEvent } from './spawnBuggyEvents';

/**
 * SpawnBuggyDespawnZone
 * 
 * Attach this to a Trigger set to "Objects Tagged" and set the tag to match your spawned buggy tag.
 * When any tagged object (your buggy body) enters, this component requests a despawn of JUST that buggy.
 *
 * Default workflow:
 *  - SpawnUI tags spawned buggy entities with 'buggy' and a short group tag 'gid:<id>'.
 *  - This zone reads the entering entity's tags and sends:
 *      - requestDespawnByEntityEvent({ entityId })  -> SpawnUI resolves the group and deletes it
 *    If a 'gid:<id>' tag is found, it also sends requestDespawnGroupEvent for robustness.
 */
export class SpawnBuggyDespawnZone extends Component<typeof SpawnBuggyDespawnZone> {

  static propsDefinition = {
    /**
     * Optional: only act when the entering entity contains this tag.
     * Leave empty to despawn any entity that enters (not recommended).
     */
    objectTag: { type: PropTypes.String, default: 'buggy' },

    /**
     * Optional feedback text gizmo (e.g., to display "Buggy returned")
     */
    feedbackText: { type: PropTypes.Entity, default: null },
  };

  private originalText: string | null = null;

  start() {
    // Cache the original text
    const __ft:any = this.props.feedbackText as any;
    const tg: TextGizmo | null = __ft ? __ft.as(TextGizmo) : null;
    if (tg) this.originalText = tg.text.get();

    // When a tagged entity enters, request despawn-by-entity
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnEntityEnterTrigger, (entering: Entity) => {
      try {
        const tag = this.props.objectTag?.toString() || '';
        if (tag && !entering.tags.contains(tag)) {
          return;
        }
        // Primary path: resolve by entity id
        this.sendNetworkBroadcastEvent(requestDespawnByEntityEvent, { entityId: entering.id });

        // Best-effort: also resolve by group tag if present
        const tags = entering.tags.get();
        const gidTag = (tags || []).find(t => typeof t === 'string' && t.startsWith('gid:'));
        if (gidTag) {
          const gid = gidTag.slice(4);
          this.sendNetworkBroadcastEvent(requestDespawnGroupEvent, { groupId: gid });
        }

        if (tg) tg.text.set('Buggy returned');

      } catch (err) {
        // ignore
      }
    });
  }

  dispose(): void {
    const __ft:any = this.props.feedbackText as any;
    const tg: TextGizmo | null = __ft ? __ft.as(TextGizmo) : null;
    if (tg && this.originalText != null) tg.text.set(this.originalText);
    super.dispose();
  }
}

Component.register(SpawnBuggyDespawnZone);
