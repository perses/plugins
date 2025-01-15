export const DEFAULT_CONNECT_NULLS = false;
export const DEFAULT_LINE_WIDTH = 1.25;
export const POINT_SIZE_OFFSET = 1.5;
export const DEFAULT_POINT_RADIUS = DEFAULT_LINE_WIDTH + POINT_SIZE_OFFSET;
export const DEFAULT_AREA_OPACITY = 0;
export type StackOptions = 'none' | 'all';

export interface QuerySettingsOptions {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export const DEFAULT_VISUAL = {
  lineWidth: DEFAULT_LINE_WIDTH,
  areaOpacity: DEFAULT_AREA_OPACITY,
  pointRadius: DEFAULT_POINT_RADIUS,
  connectNulls: DEFAULT_CONNECT_NULLS,
};
