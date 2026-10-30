# Canvas data-driven graph demo

This directory provides a self-contained demo for the canvas panel's **data-driven graph mode**: a
small microservice topology served as Prometheus metrics, plus a ready-to-apply dashboard. Use it to
see nodes and edges generated live from query data.

The stock Perses dev metrics do not carry paired `source`/`target` labels, so they cannot exercise
edge generation. The exporter here is shaped for the feature:

- `node_load{instance="..."}` — one series per node. The `instance` label is the node id, and each
  series also carries `name`, `role`, `tier`, and `region` labels for richer captions.
- `edge_traffic{source=...,target=...}` — one series per directed edge.

Each series' value (0..1) drives node/edge color via the panel thresholds and edge thickness via the
edge-thickness thresholds. Nodes use a traffic-light scheme (green → amber → red) while edges use a
separate blue → indigo → purple scheme, so the demo shows the independent **Node color** and **Edge
color** thresholds. Nodes also grow with their value via the **Node size** thresholds. The demo
dashboard builds node captions from the extra labels with a template (`{{name}} · {{value}}`); try
other labels such as `{{role}}` or `{{region}}` to see how the label templates work.

## Prerequisites

- Docker.
- A local checkout of [`perses/perses`](https://github.com/perses/perses) with its dev stack, plus
  `percli`. See the [plugin development guide](../../../README.md#development).

## Steps

1. **Start the demo exporter** (from the plugins repo root). It serves the metrics at
   `http://localhost:9101/metrics`:

   ```bash
   docker compose --file docs/canvas/examples/docker-compose.yml up --detach
   ```

2. **Scrape it from the Perses dev Prometheus.** In your `perses/perses` checkout, add this job
   under `scrape_configs:` in `dev/extra/prometheus.yaml`, then start/restart Prometheus:

   ```yaml
   - job_name: 'canvas-demo'
     honor_labels: true
     scrape_interval: 5s
     static_configs:
       - targets: ['host.docker.internal:9101']
   ```

   ```bash
   docker compose --file dev/docker-compose.yaml --profile prometheus up --detach
   ```

   The dev `PrometheusLocal` datasource (`http://localhost:9090`) is the default, so no datasource
   setup is needed. Confirm `node_load` and `edge_traffic` return data at `http://localhost:9090`.

3. **Run the backend and the plugin dev server.** In `perses/perses`, set `plugin.enable_dev: true`
   in `dev/config.yaml`, then:

   ```bash
   ./scripts/api_backend_dev.sh
   percli login http://localhost:8080
   ```

   From the plugins repo, point the plugin dev server at the canvas workspace:

   ```bash
   percli plugin start ./canvas
   ```

4. **Load the demo dashboard** (or build a panel by hand with the two queries above):

   ```bash
   percli project perses
   percli apply -f docs/canvas/examples/dashboard.json
   ```

   Open the `CanvasGraphDemo` dashboard in the `perses` project. You should see the microservice
   nodes and the links between them, laid out automatically and colored by the thresholds. Pan with
   a left or middle mouse drag and zoom with the wheel; double-click to reset the pan, or
   ctrl/cmd-double-click to fit the whole graph to the panel.

5. **Experiment.** Edit `metrics/topology.prom` to change values, or add/remove `node_load` /
   `edge_traffic` series, then reload the exporter:

   ```bash
   docker compose --file docs/canvas/examples/docker-compose.yml restart
   ```

   Changing values recolors nodes/edges in place on the next refresh; adding or removing a series
   changes the topology and triggers a fresh layout.

## Teardown

```bash
docker compose --file docs/canvas/examples/docker-compose.yml down
```

Remove the `canvas-demo` scrape job from `dev/extra/prometheus.yaml` when you are done.
