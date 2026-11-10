// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let canvasContext: CanvasRenderingContext2D | null | undefined;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (canvasContext === undefined) {
    canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  }
  return canvasContext;
}

/**
 * Measure the pixel width of text at a given font weight and size.
 * Returns a character-count approximation when a canvas context is unavailable (jsdom/SSR).
 */
export function measureTextWidth(text: string, fontWeight: number, fontSize: number, fontFamily: string): number {
  const ctx = getCanvasContext();
  if (!ctx) return text.length * 6;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}
