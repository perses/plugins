# Table Go SDK

## Constructor

```golang
package main

import table "github.com/perses/plugins/table/sdk/go"

var options []table.Option
table.Table(options...)
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
table.WithDensity(table.ComfortableDensity)
```

Set the table density. Available options: `CompactDensity`, `StandardDensity`, `ComfortableDensity`.

### Default table settings

```golang
package main

import table "github.com/perses/plugins/table/sdk/go"

table.WithDefaultColumWidth(150)
table.WithDefaultColumHeight(32)
table.WithDefaultColumnHidden(false)
table.WithDefaultPagination(true)
table.WithEnableFiltering(true)
table.WithEnableSorting(true)
```

Configure default column width and height, whether columns are hidden by default, pagination, filtering, and sorting. The option names `WithDefaultColumWidth` and `WithDefaultColumHeight` are retained as provided by the Go SDK.

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
		HeaderDescription: "Metric name",
		CellDescription:   "The metric value",
		Align:         table.LeftAlign,
		EnableSorting: true,
		Sort:          table.AscSort,
		Width:         200.0,
		Hide:          false,
		CellSettings: []table.CellSettings{
			{
				Condition: table.Condition{
					Kind: table.MiscConditionKind,
					Spec: &table.MiscConditionSpec{Value: table.NullValue},
				},
				Text: "N/A",
				Prefix: "[",
				Suffix: "]",
			},
		},
		Format: &common.Format{
			Unit:          &common.DecimalUnit,
			DecimalPlaces: 2,
		},
		DataLink: &table.DataLink{
			URL:        "http://example.com/details/${__data.fields[\"metric_name\"]}",
			OpenNewTab: true,
			Title:      "View details",
		},
	},
})
```

Configure individual columns. Available align options: `LeftAlign`, `CenterAlign`, `RightAlign`. Available sort options: `AscSort`, `DescSort`. `HeaderDescription` configures the header tooltip, `CellDescription` configures the cell tooltip, `Hide` hides the column, and `CellSettings` configures conditional styling and text for cells in the column.

The `DataLink` field allows adding a clickable link to cells in the column. It supports variable substitution in the URL (e.g., `${__data.fields["column_name"]}`).

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
		Text:            "High",
		Prefix:          "~",
		Suffix:          "%",
	},
})
```

Configure cell styling and displayed text based on conditions. Available condition kinds: `ValueConditionKind`, `RangeConditionKind`, `RegexConditionKind`, `MiscConditionKind`. `Text`, `Prefix`, and `Suffix` control the displayed cell text.

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
				table.Table(
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
