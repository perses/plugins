# TimeSeriesChart Panel Plugin

### How to install

This plugin requires react and react-dom 18

Install peer dependencies:

```bash
npm install react@18 react-dom@18
```

Install the plugin:

```bash
npm install @perses-dev/timeseries-chart-plugin
```

## Dense charts

With `visual.showPoints: auto` (the default), point markers are shown only for time ranges up to 15 minutes
and at most 70 visible series. Denser charts keep all series and values, but omit individual point markers
to reduce rendering work. Selecting fewer series in the legend restores automatic markers for short ranges.
Use `visual.showPoints: always` to display every marker regardless of series count; this can slow down dense charts.

Exemplar diamonds remain visible for selected series regardless of the point-marker setting. Legend selection
reuses prepared samples, statistics, and exemplar markers; hovering or pinning exemplar tooltips does not resize
the chart or rebuild its datasets.

## Development

### Setup

Install dependencies:

```bash
npm install
```

### Get Started

Start the dev server:

```bash
npm run dev
```

Build the plugin for distribution:

```bash
npm run build
```
