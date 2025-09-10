/**
 * @file Easy Tour Buggy System — Buggy Controller (movement/loop reset/stop tags)
 * @author 2ndLife Rich — HumAi LLC
 * © 2025 HumAi LLC — MIT License. SPDX-License-Identifier: MIT
 *
 * @overview
 * Attach to the buggy root (or a parent). Drives smooth kinematic motion along
 * a configurable axis and reacts to local events:
 *  - `TourControlEvent { action: 'start'|'stop', targetEntityId? }`
 *  - `TourPathEvent { travelAxis, faceAxis?, stop?, targetEntityId? }`
 *
 * @props
 * - `moveEntity: Entity` (optional)  Entity to move; defaults to this.entity
 * - `speed: number` (default 3)      Units per second
 * - `stopTriggerTag: string` (default "stop")  Any trigger with this tag halts the buggy
 * - `axis: string` (default "z")     Local travel axis when no path events are active
 *
 * @usage
 * 1) Add to buggy root.
 * 2) Optionally set `moveEntity` to a mesh child if the script sits on a container.
 * 3) Use `tourBuggyUI.ts` or `tourBuggyGuidance.ts` to send control/path events.
 */

import * as hz from 'horizon/core';
import { TourControlEvent, TourPathEvent } from './tourBuggyEvents';

class TourBuggy extends hz.Component<typeof TourBuggy> {
  static propsDefinition = {
    // The entity to move. If not set, uses this.entity
    moveEntity: { type: hz.PropTypes.Entity },
    // Units per second along the chosen axis
    speed: { type: hz.PropTypes.Number, default: 3 },
    // Tag placed on trigger gizmos that should stop the buggy
    stopTriggerTag: { type: hz.PropTypes.String, default: 'stop' },
    // The local movement axis (single field). Examples: "x", "-z", "0,1,0", "1 0 1".
    // Default is local +Z ("z").
    axis: { type: hz.PropTypes.String, default: 'z' },
  };

  private paused: boolean = false;


  private target!: hz.Entity;
  private running = false; // start OFF until UI starts the tour
  private kinematicVel: hz.Vec3 = new hz.Vec3(0, 0, 0);
  private worldTravelDir: hz.Vec3 | undefined = undefined; // world-space movement override
  
  // Store initial transform for reset
  private initialPosition: hz.Vec3 | null = null;
  private initialRotation: hz.Quaternion | null = null;

  start() {
    this.target = this.props.moveEntity ?? this.entity;

    // Listen for UI start/stop events - respond only if targeted to this entity or broadcast to all
    this.connectLocalBroadcastEvent(TourControlEvent, ({ action, pause, targetEntityId }) => {
      // If targetEntityId is specified, only respond if it matches this entity
      if (targetEntityId && targetEntityId !== this.entity.id) return;
      
      if (action === 'start') { this.startMotion(); return; }
      // action === 'stop'
      if (pause) {
        // UI pause-in-place: stop updates, keep transform
        this.paused = true;
        this.running = false;
        this.kinematicVel = new hz.Vec3(0,0,0);
      } else {
        // Hard reset (guidance/physical triggers)
        this.stopMotion();
      }
    });

    // Subscribe to all triggers tagged with the stop tag
    const stopTag = this.props.stopTriggerTag ?? 'stop';
    const triggers = this.world.getEntitiesWithTags([stopTag]);
    for (const trg of triggers) {
      this.connectCodeBlockEvent(trg, hz.CodeBlockEvents.OnEntityEnterTrigger, (enteredBy: hz.Entity) => {
        // Stop when this mover enters the stop trigger
        if (enteredBy === this.target) { this.stopMotion(); return; }
      });
    }

    // Per-frame update
    this.connectLocalBroadcastEvent(hz.World.onUpdate, ({ deltaTime }) => this.onUpdate(deltaTime));

    // New simple pathing event: directly set travel direction (world axis) and optional facing
    this.connectLocalBroadcastEvent(TourPathEvent, ({ travelAxis, faceAxis, stop, targetEntityId }) => {
      // If targetEntityId is specified, only respond if it matches this entity
      if (targetEntityId && targetEntityId !== this.entity.id) return;
      
      if (stop) { this.stopMotion(); return; }
      const travel = this.parseAxisToWorldDir(travelAxis);
      const face = faceAxis ? this.parseAxisToWorldDir(faceAxis) : travel;
      // Align facing, and move exactly along the desired world direction
      this.faceAlongWorldDir(face, 0);
      this.worldTravelDir = travel;
      this.kinematicVel = new hz.Vec3(0, 0, 0);
    });
  }

  private startMotion() {
    if (!this.running) {
      // Store initial transform when first starting
      this.initialPosition = this.target.position.get().clone();
      this.initialRotation = this.target.rotation.get().clone();
    }
    this.running = true;
    this.paused = false;
  }

  private stopMotion() {
    this.running = false;
    this.kinematicVel = new hz.Vec3(0, 0, 0);
    this.paused = false;
    
    // Reset to initial transform if available
    if (this.initialPosition && this.initialRotation) {
      this.target.position.set(this.initialPosition);
      this.target.rotation.set(this.initialRotation);
    }
  }

  private moveVector(): hz.Vec3 {
    if (this.worldTravelDir) {
      // Use world-space travel direction directly
      return this.worldTravelDir;
    }
    const rot = this.target.rotation.get();
    // Axis is from the configured prop when no world override is active
    const s = ((this.props.axis ?? 'z').trim().toLowerCase());
    let local: hz.Vec3 | null = null;
    if (s === 'x') local = new hz.Vec3(1, 0, 0);
    else if (s === '-x') local = new hz.Vec3(-1, 0, 0);
    else if (s === 'y') local = new hz.Vec3(0, 1, 0);
    else if (s === '-y') local = new hz.Vec3(0, -1, 0);
    else if (s === 'z') local = new hz.Vec3(0, 0, 1);
    else if (s === '-z') local = new hz.Vec3(0, 0, -1);
    else {
      const parts = s.split(/[ ,]+/).map((p) => parseFloat(p)).filter((n) => !Number.isNaN(n));
      if (parts.length === 3) local = new hz.Vec3(parts[0], parts[1], parts[2]);
    }
    if (!local) local = new hz.Vec3(0, 0, 1); // default
    // Normalize to avoid speed scaling with vector magnitude
    const mag = local.magnitude();
    if (mag > 1e-6) local = local.mul(1 / mag);
    return hz.Quaternion.mulVec3(rot, local);
  }

  // Removed old relative turn logic; orientation is now driven by TourPathEvent faceAxis

  // Parses axis strings like 'x', '-z', '0,1,0' into a world-space direction vector (normalized)
  private parseAxisToWorldDir(s: string): hz.Vec3 {
    const t = (s || '').trim().toLowerCase();
    let v: hz.Vec3 | null = null;
    if (t === 'x') v = new hz.Vec3(1, 0, 0);
    else if (t === '-x') v = new hz.Vec3(-1, 0, 0);
    else if (t === 'y') v = new hz.Vec3(0, 1, 0);
    else if (t === '-y') v = new hz.Vec3(0, -1, 0);
    else if (t === 'z') v = new hz.Vec3(0, 0, 1);
    else if (t === '-z') v = new hz.Vec3(0, 0, -1);
    else {
      const parts = t.split(/[ ,]+/).map((p) => parseFloat(p)).filter((n) => !Number.isNaN(n));
      if (parts.length === 3) v = new hz.Vec3(parts[0], parts[1], parts[2]);
    }
    if (!v) v = new hz.Vec3(0, 0, 1);
    const mag = v.magnitude();
    return mag > 1e-6 ? v.mul(1 / mag) : new hz.Vec3(0, 0, 1);
  }

  // Face the buggy so that its LOCAL -Y axis points along the given WORLD direction
  private faceAlongWorldDir(targetWorldDir: hz.Vec3, extraYawDeg: number = 0) {
    const forward = targetWorldDir; // desired world travel direction
    const base = hz.Quaternion.lookRotation(forward);
    // Model-forward correction: our movement uses local -Y as forward.
    // We want (-Y)_local to map to forward. Since lookRotation maps (+Z)_local -> forward,
    // multiply by a correction C so that C * (-Y) = +Z. That is a -90deg rotation around X.
    const correction = hz.Quaternion.fromEuler(new hz.Vec3(-90, 0, 0));
    let finalRot = base.mul(correction);
    if (extraYawDeg) {
      finalRot = finalRot.mul(hz.Quaternion.fromEuler(new hz.Vec3(0, extraYawDeg, 0)));
    }
    this.target.rotation.set(finalRot);
  }

  private onUpdate(dt: number) {
    if (!this.running) return; if (this.paused) return;
    const forward = this.moveVector();
    const spd = this.props.speed ?? 3;
    // Always kinematic translate with a fixed smoothing to avoid choppy motion
    const desiredVel = forward.mul(spd);
    const smooth = 12; // responsiveness in 1/s (fixed)
    const alpha = smooth > 0 ? 1 - Math.exp(-smooth * Math.max(0, dt)) : 1; // if 0, jump to desired
    this.kinematicVel = this.kinematicVel.mul(1 - alpha).add(desiredVel.mul(alpha));
    const pos = this.target.position.get();
    this.target.position.set(pos.add(this.kinematicVel.mul(Math.max(0, dt))));
  }
}
hz.Component.register(TourBuggy);