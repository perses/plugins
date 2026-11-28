# Canvas model

```yaml
kind: "Canvas"
spec:
  legend: <Legend specification> # Optional
  thresholds: <Thresholds specification> # Optional
  # Color scheme for edges. Falls back to `thresholds` when unset.
  edgeThresholds: <Thresholds specification> # Optional
  format: <Format specification> # Optional
  # Base width/height (px) for generated nodes, scaled by `nodeThresholdSizes`. Must be > 0.
  nodeDefaultSize: <number | default = 48> # Optional
  nodeThresholdSizes:
  - <Node Threshold Step specification> # Optional
  # Default edge thickness (px) when not threshold-driven. Must be > 0.
  edgeDefaultStrokeWidth: <number | default = 2> # Optional
  edgeThresholdWidths:
  - <Edge Threshold Step specification> # Optional
  backgrounds:
  - <Background specification> # Optional
  nodes:
  - <Node specification> # Optional
  edges:
  - <Edge specification> # Optional
  graphGeneration: <Graph Generation specification> # Optional
```

A node or edge bound to a query is colored, sized, and labeled from the **last value** of its series:
threshold color from `thresholds` (nodes) or `edgeThresholds` (edges), size from `nodeThresholdSizes`,
thickness from `edgeThresholdWidths`. Labels interpolate `{{<label_name>}}` (a series label) and
`{{value}}` (the formatted last value); an unknown placeholder resolves to an empty string. Setting
`graphGeneration.enabled` builds the graph from query results instead of the manual `nodes`/`edges`.

## Legend specification

```yaml
position: <enum = "bottom" | "right"> # Required
```

## Thresholds specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#thresholds-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Node specification

```yaml
id: <string> # Required
position:
  x: <number> # Required
  y: <number> # Required
width: <number> # Required. Must be > 0
height: <number> # Required. Must be > 0
kind: <enum = "rectangle" | "icon" | "text"> # Required
# Caption. Supports {{label}} / {{value}} templates when the node binds to a query.
label: <string> # Optional
labelPosition: <enum = "above" | "below" | "left" | "right" | "center"> # Optional
labelPadding: <number> # Optional. Must be >= 0
icon: <string> # Optional. Icon name, used when kind is "icon"
url: <string> # Optional. Link opened when the node is clicked
background: <string> # Optional. Hex color
# Image URL. Must use https:// or be a data URI (data:image/png, jpeg, gif, webp, or avif).
backgroundImage: <string> # Optional. Image URL
# Index of the query whose last value drives this node's threshold color, {{value}} label, and size.
queryIndex: <number> # Optional. Must be >= 0
# "threshold" colors the node from `thresholds`; "fixed" uses `color`.
colorMode: <enum = "threshold" | "fixed"> # Optional
color: <string> # Optional. Hex color, used when colorMode is "fixed"
# "threshold" scales the node's base size by the `nodeThresholdSizes` steps.
sizeMode: <enum = "fixed" | "threshold" | default = "fixed"> # Optional
```

## Edge specification

```yaml
id: <string> # Required
name: <string> # Optional
source: <string> # Required. id of the source node
target: <string> # Optional. id of the target node; omit when the edge ends at freeEndpoint
sourceAnchor: <enum = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"> # Optional
targetAnchor: <enum = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"> # Optional
# Fixed endpoint when the edge has no target node.
freeEndpoint:
  x: <number>
  y: <number> # Optional
bidirectional: <boolean | default = false> # Optional
# "threshold" sets thickness from `edgeThresholdWidths`; otherwise `strokeWidth` is used.
thicknessMode: <enum = "fixed" | "threshold" | default = "fixed"> # Optional
strokeWidth: <number> # Optional. Must be > 0. Defaults to `edgeDefaultStrokeWidth`
# Query whose last value drives the edge color/thickness and the sourceLabelTemplate.
sourceQueryIndex: <number> # Optional. Must be >= 0
# Query backing the targetLabelTemplate (e.g. a reverse-direction metric).
targetQueryIndex: <number> # Optional. Must be >= 0
# Captions near each end. Support {{label}} / {{value}} templates.
sourceLabelTemplate: <string> # Optional
targetLabelTemplate: <string> # Optional
```

## Background specification

```yaml
id: <string> # Required
name: <string> # Optional
position:
  x: <number> # Required
  y: <number> # Required
width: <number> # Required. Must be > 0
height: <number> # Required. Must be > 0
color: <string> # Optional. Hex color
opacity: <number> # Optional. Between 0 and 1
# Image URL. Must use https:// or be a data URI (data:image/png, jpeg, gif, webp, or avif).
image: <string> # Optional. Image URL
imageFit: <enum = "cover" | "contain" | "stretch" | default = "cover"> # Optional
# When true, the background is anchored to the viewport and does not pan/zoom with the graph.
global: <boolean | default = false> # Optional
```

## Node Threshold Step specification

```yaml
# The last step whose value is <= the node's bound value applies.
value: <number> # Required
scale: <number> # Required. Must be > 0. Multiplier applied to the node's base size
```

## Edge Threshold Step specification

```yaml
# The last step whose value is <= the edge's bound value applies.
value: <number> # Required
strokeWidth: <number> # Required. Must be > 0. Edge thickness (px) for this step
```

## Graph Generation specification

```yaml
enabled: <boolean | default = false> # Optional. When false, the manual nodes/edges are used
# Index of the query whose series define the nodes; one node per distinct nodeIdLabel value.
nodeQueryIndex: <number> # Required. Must be >= 0
nodeIdLabel: <string> # Required. Series label that identifies a node (e.g. "instance")
# Node caption template. Defaults to the value of nodeIdLabel.
nodeLabelTemplate: <string> # Optional
# Index of the query whose series define the edges. Omit for a nodes-only graph.
edgeQueryIndex: <number> # Optional. Must be >= 0
edgeSourceLabel: <string> # Optional. Series label naming the edge's source node
# Series label naming the edge's target node; edges to unknown nodes are dropped.
edgeTargetLabel: <string> # Optional
edgeLabelTemplate: <string> # Optional. Edge caption template
bidirectional: <boolean | default = false> # Optional. Render generated edges in both directions
```

## Examples

### Manual graph

Nodes and edges are authored by hand and positioned explicitly. Each node binds to a query via
`queryIndex` and is colored by `thresholds`; each edge binds via `sourceQueryIndex` and thickens with
its value (`thicknessMode: threshold`). Edge end labels use the `{{value}}` template.

```yaml
kind: Canvas
spec:
  format:
    unit: bytes
    shortValues: true
  legend:
    position: bottom
  thresholds:
    defaultColor: "#4caf50"
    steps:
      - { value: 400000000, color: "#f9a825" }
      - { value: 500000000, color: "#d32f2f" }
  edgeDefaultStrokeWidth: 2
  edgeThresholdWidths:
    - { value: 50000000, strokeWidth: 2 }
    - { value: 200000000, strokeWidth: 4 }
    - { value: 500000000, strokeWidth: 7 }
  nodes:
    - id: core
      kind: icon
      icon: ServerNetwork
      label: Core Switch
      labelPosition: above
      position: { x: 220, y: 300 }
      width: 64
      height: 64
      colorMode: threshold
      queryIndex: 0
    - id: agg1
      kind: icon
      icon: Router
      label: Aggregation 1
      labelPosition: above
      position: { x: 490, y: 190 }
      width: 48
      height: 48
      colorMode: threshold
      queryIndex: 0
    - id: leaf1
      kind: icon
      icon: Server
      label: Leaf 1
      labelPosition: right
      position: { x: 760, y: 190 }
      width: 52
      height: 52
      colorMode: threshold
      queryIndex: 1
  edges:
    - id: e-core-agg1
      name: Core <-> Aggregation 1
      source: core
      sourceAnchor: ne
      target: agg1
      targetAnchor: w
      bidirectional: true
      thicknessMode: threshold
      sourceQueryIndex: 0
      sourceLabelTemplate: "{{value}}"
      targetLabelTemplate: "{{value}}"
    - id: e-agg1-leaf1
      name: Aggregation 1 -> Leaf 1
      source: agg1
      sourceAnchor: e
      target: leaf1
      targetAnchor: w
      thicknessMode: threshold
      sourceQueryIndex: 1
      sourceLabelTemplate: "{{value}}"
queries:
  - kind: TimeSeriesQuery
    spec:
      plugin:
        kind: PrometheusTimeSeriesQuery
        spec:
          query: process_resident_memory_bytes
  - kind: TimeSeriesQuery
    spec:
      plugin:
        kind: PrometheusTimeSeriesQuery
        spec:
          query: go_memstats_heap_inuse_bytes
```

### Generated graph

Nodes and edges are derived from query results instead of being authored by hand: nodes come from the
first query (keyed on the `instance` label) and edges from the second (keyed on `source`/`target`
labels). Nodes are colored and sized by their value, edges get their own color scheme and thicken
with traffic, and captions use `{{label}}` / `{{value}}` templates.

```yaml
kind: Canvas
spec:
  format:
    unit: decimal
  legend:
    position: bottom
  thresholds:
    steps:
      - { value: 0.5, color: "#f9a825" }
      - { value: 0.8, color: "#d32f2f" }
  edgeThresholds:
    defaultColor: "#90caf9"
    steps:
      - { value: 0.5, color: "#5c6bc0" }
      - { value: 0.8, color: "#6a1b9a" }
  edgeThresholdWidths:
    - { value: 0.5, strokeWidth: 4 }
    - { value: 0.8, strokeWidth: 8 }
  nodeThresholdSizes:
    - { value: 0.5, scale: 1.3 }
    - { value: 0.8, scale: 1.7 }
  nodeDefaultSize: 44
  graphGeneration:
    enabled: true
    nodeQueryIndex: 0
    nodeIdLabel: instance
    nodeLabelTemplate: "{{name}} · {{value}}"
    edgeQueryIndex: 1
    edgeSourceLabel: source
    edgeTargetLabel: target
    edgeLabelTemplate: "{{value}}"
```
