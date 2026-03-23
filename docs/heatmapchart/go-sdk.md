# HeatMapChart Go SDK

## Constructor

```golang
package main

import heatmap "github.com/perses/plugins/heatmapchart/sdk/go"

var options []heatmap.Option
heatmap.Chart(options...)
```

Need a list of options.

## Default options

- YAxisFormat: `{Unit: DecimalUnit, DecimalPlaces: 2}`
- CountFormat: `{Unit: DecimalUnit, DecimalPlaces: 2}`
- ShowVisualMap: `true`

## Available options

### YAxisFormat

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	heatmap "github.com/perses/plugins/heatmapchart/sdk/go"
)

heatmap.YAxisFormat(common.Format{Unit: &common.DecimalUnit, DecimalPlaces: 1})
```

Define the format for the Y-axis values.

### CountFormat

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	heatmap "github.com/perses/plugins/heatmapchart/sdk/go"
)

heatmap.CountFormat(common.Format{Unit: &common.DecimalUnit, DecimalPlaces: 0})
```

Define the format for the count/frequency values in the heatmap.

### ShowVisualMap

```golang
package main

import heatmap "github.com/perses/plugins/heatmapchart/sdk/go"

heatmap.ShowVisualMap(false)
```

Control whether to show the visual map (color legend) for the heatmap.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	"github.com/perses/perses/go-sdk/common"
	heatmap "github.com/perses/plugins/heatmapchart/sdk/go"
)

func main() {
	dashboard.New("Heatmap Dashboard",
		dashboard.AddPanel("Request Latency Heatmap",
			panel.New(
				heatmap.Chart(
					heatmap.YAxisFormat(common.Format{Unit: &common.TimeUnit, DecimalPlaces: 2}),
					heatmap.CountFormat(common.Format{Unit: &common.DecimalUnit, DecimalPlaces: 0}),
					heatmap.ShowVisualMap(true),
				),
			),
		),
	)
}```
```
