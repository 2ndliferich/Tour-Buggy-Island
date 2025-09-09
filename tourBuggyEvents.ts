import * as hz from 'horizon/core';

// Shared local events so different components can communicate without direct references
// Use a stable name so multiple instances refer to the same logical channel.

export type TourControlPayload = { action: 'start' | 'stop'; pause?: boolean; targetEntityId?: bigint };
export const TourControlEvent = new hz.LocalEvent<TourControlPayload>('TourControlEvent');

// Simple pathing event: set the axis to travel along and optionally the axis to face
export type TourPathPayload = { travelAxis: string; faceAxis?: string; stop?: boolean; targetEntityId?: bigint };
export const TourPathEvent = new hz.LocalEvent<TourPathPayload>('TourPathEvent');
