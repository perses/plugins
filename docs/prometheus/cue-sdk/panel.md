# Prometheus Panel Builder

The Prometheus Panel builder is a simple wrapper to help creating panels that query a prometheus datasource.

## Usage

```cue
package myDaC

import (
	panelBuilder "github.com/perses/plugins/prometheus/sdk/cue/panel"
)

panelBuilder & {} // input parameters expected
```

## Parameters

| Parameter       | Type                                                                           | Mandatory/Optional | Default | Description                                                |
|-----------------|--------------------------------------------------------------------------------|--------------------|---------|------------------------------------------------------------|
| `spec`          | [PanelSpec](https://perses.dev/perses/docs/api/dashboard/#panel-specification) | Mandatory          |         | A PanelSpec object                                         |
| `#clause`       | `"by"` \| `"without"` \| `""`                                                  | Optional           | `""`    | The aggregation clause for this panel's queries.           |
| `#clauseLabels` | [...string]                                                                    | Optional           | []      | The labels on which to aggregate for this panel's queries. |

the panel spec object can use the following string fields provided by the builder, via interpolation:

| Field   | Type   | Description                                                                                         |
|---------|--------|-----------------------------------------------------------------------------------------------------|
| `#aggr` | string | Aggregation clause built from the provided `#clause` and `#clauseLabels`. E.g `by (namespace, pod)` |

## Example

```cue
package myDaC

import (
	timeseriesChart "github.com/perses/plugins/timeserieschart/schemas:model"
	panelBuilder "github.com/perses/plugins/prometheus/sdk/cue/panel"
	promQuery "github.com/perses/plugins/prometheus/schemas/prometheus-time-series-query:model"
)

#cpuPanel: this=panelBuilder & {
	#clause: "by"
	#clauseLabels: ["container"]

	spec: {
		display: name: "Container CPU"
		plugin: timeseriesChart
		queries: [
			{
				kind: "TimeSeriesQuery"
				spec: plugin: promQuery & {
					spec: query: "sum \(this.#aggr) (container_cpu_usage_seconds{})"
				}
			},
		]
	}
}

#cpuPanel
```
