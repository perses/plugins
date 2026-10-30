# Plugin Module: canvas 

The canvas panel renders weathermap-style network diagrams. Nodes and edges can be colored by
query-bound thresholds, labeled with metric values, and (for edges) scaled in thickness by value.

The panel has two modes, selected in the panel's **Settings** editor under **Items**:

- **Manual** — draw the graph by hand: place nodes, connect them with edges, and add background
  shapes or images. Each node/edge can bind to a query to drive its color and label.
- **From data** — generate the graph live from query results. Use this for dynamic topologies
  (for example, frequently changing service or host relationships) where drawing by hand is not
  feasible.

### Data-driven mode

In **From data** mode the panel derives nodes and edges from your queries on every refresh and
lays them out automatically — no manual positioning. Graph structure is inferred from the labels on
the returned time series, and each series' **last value** drives color (via the panel thresholds),
label interpolation, and edge thickness.

Configuration:

- **Node query** — the query whose series define the nodes.
- **Node id label** — the series label that identifies a node (e.g. `instance`). One node is created
  per distinct label value.
- **Node label template** — optional caption, using `{{label_name}}` / `{{value}}` placeholders.
  Defaults to the node id label.
- **Edge query** — the query whose series define the edges (leave as *None* for a nodes-only graph).
- **Edge source label** / **Edge target label** — series labels whose values name the edge's source
  and target nodes. Edges whose endpoints are not among the generated nodes are dropped.
- **Edge label template** — optional edge caption (e.g. `{{value}}`).
- **Bidirectional edges** — render edges with arrows in both directions.

Node colors come from the **Node color** thresholds configured for the panel, and edge colors use
those same thresholds. Edge thickness is set per breakpoint under **Edge thickness**. Layout is
deterministic: a given topology always settles to the same positions, so nodes stay put as their
metric values change — they only move when nodes or edges are added or removed.

### How to install

This plugin requires react and react-dom 18 or 19.

Install peer dependencies:

```bash
npm install react@18 react-dom@18 # or react@19 react-dom@19
```

Install the plugin:

```bash
npm install @my-org/canvas-plugin
```

The Perses UI packages your plugin depends on are now maintained in the [`perses/shared`](https://github.com/perses/shared) repository. If you need to develop against local copies of those packages, follow the linking instructions in that repo.

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
