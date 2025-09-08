import * as hz from 'horizon/core';
import { TourControlEvent, TourPathEvent } from './tourBuggyEvents';

/**
 * Attach this to a trigger gizmo. When entered, it can:
 * - Stop: send TourControlEvent { action: 'stop' }
 * - Path: send TourPathEvent { travelAxis, faceAxis? }
 */
class GuidanceTrigger extends hz.Component<typeof GuidanceTrigger> {
  static propsDefinition = {
    // If true, emit a stop event
    stop: { type: hz.PropTypes.Boolean, default: false },
    // Required for pathing: the world axis to TRAVEL along (e.g., 'z', '-x', '0,1,0')
    travelAxis: { type: hz.PropTypes.String, default: '' },
    // Optional: the world axis to FACE (defaults to travelAxis if empty)
    faceAxis: { type: hz.PropTypes.String, default: '' },
  };

  start() {
    const handleEntityEnter = (enteredBy: hz.Entity) => {
      if (this.props.stop) {
        this.sendLocalBroadcastEvent(TourControlEvent, { action: 'stop', targetEntityId: enteredBy.id });
        return;
      }
      const travelAxis = (this.props.travelAxis || '').trim();
      const faceAxis = (this.props.faceAxis || '').trim();
      if (travelAxis) {
        this.sendLocalBroadcastEvent(TourPathEvent, { travelAxis, faceAxis: faceAxis || undefined, targetEntityId: enteredBy.id });
      }
    };

    const handlePlayerEnter = () => {
      // For player triggers, broadcast to all buggies (no specific target)
      if (this.props.stop) {
        this.sendLocalBroadcastEvent(TourControlEvent, { action: 'stop' });
        return;
      }
      const travelAxis = (this.props.travelAxis || '').trim();
      const faceAxis = (this.props.faceAxis || '').trim();
      if (travelAxis) {
        this.sendLocalBroadcastEvent(TourPathEvent, { travelAxis, faceAxis: faceAxis || undefined });
      }
    };

    // Support both entity and player trigger modes on the gizmo
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnEntityEnterTrigger, handleEntityEnter);
    this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnPlayerEnterTrigger, handlePlayerEnter);
  }
}

hz.Component.register(GuidanceTrigger);

