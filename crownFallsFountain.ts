import * as hz from 'horizon/core';

/**
 * Crown Falls fountain controller (center-pivot spin)
 * - Rotates each water stream around its **world-space center** so UVs appear to flow.
 * - Per-stream speed, axis ('x'|'y'|'z'), and reverse toggle.
 * - Optional ambient Audio Gizmo.
 * -Creator: 2ndLife Rich: HumAi LlC
 */
class crownFallsFountain extends hz.Component<typeof crownFallsFountain> {
  static propsDefinition = {
    // --- Stream A ---
    waterStream1:         { type: hz.PropTypes.Entity },
    waterStream1_speed:   { type: hz.PropTypes.Number,  default: 0.5 },   // radians/sec
    waterStream1_reverse: { type: hz.PropTypes.Boolean, default: false },

    // --- Stream B ---
    waterStream:          { type: hz.PropTypes.Entity },
    waterStream_speed:    { type: hz.PropTypes.Number,  default: 0.5 },
    waterStream_reverse:  { type: hz.PropTypes.Boolean, default: false },

    // --- Audio (optional) ---
    soundFX:              { type: hz.PropTypes.Entity }, // AudioGizmo
  };

  start() {
    // Start looped water SFX if provided.
    if (this.props.soundFX) {
      const sfx = this.props.soundFX.as(hz.AudioGizmo);
      try { sfx.play({ fade: 0.25 }); } catch {}
    }

    // Per-frame: rotate each stream around its world-space center.
    this.connectLocalBroadcastEvent(hz.World.onUpdate, ({ deltaTime }: { deltaTime: number }) => {
      const dt = Math.max(0, (deltaTime ?? 0) / 1000); // ms -> s
      if (dt === 0) return;

      this.spinAroundCenter(
        this.props.waterStream1,
        this.props.waterStream1_speed,
        'y',  // Hardcoded axis for waterStream1
        this.props.waterStream1_reverse,
        dt
      );

      this.spinAroundCenter(
        this.props.waterStream,
        this.props.waterStream_speed,
        'x',  // Hardcoded axis for waterStream
        this.props.waterStream_reverse,
        dt
      );
    });
  }

  /** Rotate entity around its **world-space center** by (speed * dt) about its **local axis**. */
  private spinAroundCenter(
    ent: hz.Entity | null | undefined,
    speed: number,
    axisKey: string,
    reverse: boolean,
    dtSeconds: number
  ) {
    if (!ent || !Number.isFinite(speed) || speed === 0) return;

    // 1) Find world-space center from render bounds (fallback = current position).
    let center = ent.getRenderBounds?.().center;
    if (!center) center = ent.transform.position.get();

    // 2) Current world rotation & chosen local axis -> world axis.
    const curRot = ent.transform.rotation.get();
    const localAxis = this.axisFromKey(axisKey);             // unit in local space
    const worldAxis = hz.Quaternion.mulVec3(curRot, localAxis).normalize();

    // 3) Build small world-space rotation step (sign flips when reversed).
    const angle = (reverse ? -speed : speed) * dtSeconds;    // radians this frame
    const step = hz.Quaternion.fromAxisAngle(worldAxis, angle);

    // 4) New rotation = step * current (apply in world space).
    const newRot = hz.Quaternion.mul(step, curRot);

    // 5) New position so that the entity rotates **around center** (keep center fixed).
    const pos = ent.transform.position.get();
    const offset = hz.Vec3.sub(pos, center);
    const rotatedOffset = hz.Quaternion.mulVec3(step, offset);
    const newPos = hz.Vec3.add(center, rotatedOffset);

    // 6) Commit transforms in world space.
    ent.transform.rotation.set(newRot);
    ent.transform.position.set(newPos);
  }

  /** Map 'x'|'y'|'z' (case-insensitive) to unit vectors; default = Y/up. */
  private axisFromKey(key: string): hz.Vec3 {
    switch ((key ?? 'y').toLowerCase()) {
      case 'x': return hz.Vec3.right;
      case 'z': return hz.Vec3.forward;
      case 'y':
      default:  return hz.Vec3.up;
    }
  }
}

hz.Component.register(crownFallsFountain);
