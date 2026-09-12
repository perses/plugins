// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");

import { describe, expect, it } from 'vitest';

import { multiSeriesLayout } from './StatChartPanel';

describe('multiSeriesLayout', () => {
  it('keeps single series full size, no wrap', () => {
    const layout = multiSeriesLayout(1, 400, 200);
    expect(layout.wrap).toBe(false);
    expect(layout.cols).toBe(1);
    expect(layout.chartWidth).toBe(400);
    expect(layout.chartHeight).toBe(200);
  });

  it('keeps few multi-series on one row when cells stay wide enough (default behavior)', () => {
    // 3 series on 400px → ~132px each > MIN_WIDTH(100)
    const layout = multiSeriesLayout(3, 400, 200);
    expect(layout.wrap).toBe(false);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(1);
    expect(layout.chartHeight).toBe(200);
  });

  it('wraps into a grid when a single row would shrink cells below MIN_WIDTH', () => {
    // 8 series on 400px → ~48px each < 100 → wrap; sqrt(8)≈3 but maxColsByWidth=3 → 3×3
    const layout = multiSeriesLayout(8, 400, 200);
    expect(layout.wrap).toBe(true);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(3);
    expect(layout.chartWidth).toBeGreaterThanOrEqual(100);
    expect(layout.chartHeight).toBeLessThan(200);
  });

  it('uses a 3x3 grid for 9 series when width allows three MIN_WIDTH columns', () => {
    // 9 series, 400px → max 3 cols of 100px → ideal sqrt(9)=3
    const layout = multiSeriesLayout(9, 400, 300);
    expect(layout.wrap).toBe(true);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(3);
  });

  it('falls back to 2 columns when width only fits two MIN_WIDTH cells', () => {
    // 9 series, 220px → maxColsByWidth = floor(222/102)=2
    const layout = multiSeriesLayout(9, 220, 300);
    expect(layout.wrap).toBe(true);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(5);
  });
});
