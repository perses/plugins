# PieChart Go SDK

## Constructor

```golang
package main

import pie "github.com/perses/plugins/piechart/sdk/go"

var options []pie.Option
pie.Chart(options...)
```

Need a list of options.

## Default options

- Calculation: `last`
- Visual outer radius: `100` (100%)

## Available options

### WithLegend

```golang
package main

import pie "github.com/perses/plugins/piechart/sdk/go"

pie.WithLegend(pie.Legend{
	Position: pie.BottomPosition,
	Mode:     pie.ListMode,
	Size:     pie.SmallSize,
})
```

Define legend properties for the pie chart. Available positions: `BottomPosition`, `RightPosition`. Available modes: `ListMode`, `TableMode`. Available sizes: `SmallSize`, `MediumSize`.

### WithVisual

```golang
package main

import pie "github.com/perses/plugins/piechart/sdk/go"

pie.WithVisual(pie.Visual{
	OuterRadius: 90,
})
```

Define the pie chart's radii and colors. Radius values are whole-number percentages from `0` through `100`. Inner and
outer radii are passed to ECharts without enforcing an order. `WithVisual` preserves an `OuterRadius` of `0` rather
than replacing it with the default.

```golang
pie.WithVisual(pie.Visual{
	InnerRadius:  40,
	OuterRadius:  90,
	ColorPalette: []string{"#3366cc", "#dc3912"},
})
```

Set `InnerRadius` to create a doughnut chart. When omitted, the chart renders as a pie.

### WithShowLabels

```golang
pie.WithShowLabels(true)
```

Show labels inside the pie chart segments.

### WithFormat

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	pie "github.com/perses/plugins/piechart/sdk/go"
)

pie.WithFormat(&common.Format{
	Unit:          &common.DecimalUnit,
	DecimalPlaces: 2,
})
```

Define the format for pie chart values.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	pie "github.com/perses/plugins/piechart/sdk/go"
)

func main() {
	dashboard.New("Pie Chart Dashboard",
		dashboard.AddPanel("Resource Usage Distribution",
			panel.New(
				pie.Chart(
					pie.WithLegend(pie.Legend{
						Position: pie.RightPosition,
						Mode:     pie.ListMode,
						Size:     pie.MediumSize,
					}),
					pie.WithVisual(pie.Visual{
						InnerRadius: 40,
						OuterRadius: 90,
					}),
					pie.WithFormat(&common.Format{
						Unit:          &common.BytesUnit,
						DecimalPlaces: 1,
					}),
				),
			),
		),
	)
}
```
