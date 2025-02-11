import { Span } from '@perses-dev/core';

export interface GanttTrace {
  rootSpan: Span;

  // computed properties of the rootSpan
  startTimeUnixMs: number;
  endTimeUnixMs: number;
}
