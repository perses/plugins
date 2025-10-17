# Table Go SDK

## Constructor

```golang
package main

import table "github.com/perses/plugins/table/sdk/go"

var options []table.Option
table.Chart(options...)
```

Need a list of options.

## Default options

- None

## Available options

### WithDensity

```golang
package main

import table "github.com/perses/plugins/table/sdk/go"

table.WithDensity(table.CompactDensity)
table.WithDensity(table.StandardDensity)
```

Set the table density. Available options: `CompactDensity`, `StandardDensity`.

### WithColumnSettings

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	table "github.com/perses/plugins/table/sdk/go"
)

table.WithColumnSettings([]table.ColumnSettings{
	{
		Name:          "metric_name",
		Header:        "Metric",
		Align:         table.LeftAlign,
		EnableSorting: true,
		Width:         200.0,
		Format: &common.Format{
			Unit:          &common.DecimalUnit,
			DecimalPlaces: 2,
		},
	},
})
```

Configure individual columns. Available align options: `LeftAlign`, `CenterAlign`, `RightAlign`. Available sort options: `AscSort`, `DescSort`.

### WithCellSettings

```golang
package main

import table "github.com/perses/plugins/table/sdk/go"

table.WithCellSettings([]table.CellSettings{
	{
		Condition: table.Condition{
			Kind: table.RangeConditionKind,
			Spec: &table.RangeConditionSpec{
				Min: 0.8,
				Max: 1.0,
			},
		},
		TextColor:       "#FF0000",
		BackgroundColor: "#FFEEEE",
	},
})
```

Configure cell styling based on conditions. Available condition kinds: `ValueConditionKind`, `RangeConditionKind`, `RegexConditionKind`, `MiscConditionKind`.

### Transform

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	table "github.com/perses/plugins/table/sdk/go"
)

table.Transform([]common.Transform{
	// Add transforms here
})
```

Apply data transformations to the table data.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	"github.com/perses/perses/go-sdk/common"
	table "github.com/perses/plugins/table/sdk/go"
)

func main() {
	dashboard.New("Table Dashboard",
		dashboard.AddPanel("Metrics Table",
			panel.New(
				table.Chart(
					table.WithDensity(table.CompactDensity),
					table.WithColumnSettings([]table.ColumnSettings{
						{
							Name:          "instance",
							Header:        "Instance",
							Align:         table.LeftAlign,
							EnableSorting: true,
						},
						{
							Name:   "value",
							Header: "CPU Usage",
							Align:  table.RightAlign,
							Format: &common.Format{
								Unit:          &common.PercentUnit,
								DecimalPlaces: 1,
							},
						},
					}),
				),
			),
		),
	)
}```
```
