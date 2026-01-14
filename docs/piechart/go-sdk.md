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

- None

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
	Palette: pie.Palette{
		Mode: pie.AutoMode, // or pie.CategoricalMode
	},
})
```

Define visual properties of the pie chart including color palette mode.

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

### WithQuerySettings

```golang
package main

import pie "github.com/perses/plugins/piechart/sdk/go"

pie.WithQuerySettings([]pie.QuerySettingsItem{
	{
		QueryIndex: 0,
		ColorMode:  pie.FixedMode,
		ColorValue: "#FF5733",
	},
})
```

Define color settings for specific queries. Available color modes: `FixedMode`, `FixedSingleMode`.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	"github.com/perses/perses/go-sdk/common"
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
						Palette: pie.Palette{Mode: pie.CategoricalMode},
					}),
					pie.WithFormat(&common.Format{
						Unit:          &common.BytesUnit,
						DecimalPlaces: 1,
					}),
				),
			),
		),
	)
}```
```
