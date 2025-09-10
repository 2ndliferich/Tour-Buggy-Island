/**
 * @file Easy Tour Buggy System — Local Events
 * @author 2ndLife Rich — HumAi LLC
 * @copyright © 2025 HumAi LLC
 * @license MIT
 * @remarks
 * Shared local events so components can communicate without direct references.
 * - `TourControlEvent`: start/stop a buggy (optionally target a specific entityId)
 * - `TourPathEvent`: set travel axis and optional facing; can also request a stop
 *
 * SPDX-License-Identifier: MIT
 */

import * as hz from 'horizon/core';

// Shared local events so different components can communicate without direct references
// Use a stable name so multiple instances refer to the same logical channel.

export type TourControlPayload = { action: 'start' | 'stop'; pause?: boolean; targetEntityId?: bigint };
export const TourControlEvent = new hz.LocalEvent<TourControlPayload>('TourControlEvent');

// Simple pathing event: set the axis to travel along and optionally the axis to face
export type TourPathPayload = { travelAxis: string; faceAxis?: string; stop?: boolean; targetEntityId?: bigint };
export const TourPathEvent = new hz.LocalEvent<TourPathPayload>('TourPathEvent');
