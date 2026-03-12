# BarChart Go SDK

## Constructor

```golang
package main

import bar "github.com/perses/plugins/barchart/sdk/go"

var options []bar.Option
bar.Chart(options...)

```

Need a list of options.

## Default options

- Calculation(): last

## Available options

### Calculation

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/plugins/barchart/sdk/go"
)

bar.Calculation(common.Last)

```

Define the chart calculation.

### Format

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	bar "github.com/perses/plugins/barchart/sdk/go"
)

bar.Format(common.Format{...})
```

Define the chart format.

### SortingBy

```golang
import bar "github.com/perses/plugins/barchart/sdk/go"

bar.SortingBy(bar.AscSort)
```

Define the chart sorting.

### WithMode

```golang
import bar "github.com/perses/plugins/barchart/sdk/go"

bar.WithMode(bar.PercentageMode)
```

Define the chart mode.

### WithOrientation

```golang
import bar "github.com/perses/plugins/barchart/sdk/go"

bar.WithOrientation(bar.VerticalOrientation)
```

Define the chart orientation.

### WithGroupBy

```golang
import bar "github.com/perses/plugins/barchart/sdk/go"

bar.WithGroupBy([]string{"job", "instance"})
```

Define label keys used to group time series.

### WithStacked

```golang
import bar "github.com/perses/plugins/barchart/sdk/go"

bar.WithStacked(true)
```

Enable or disable stacked rendering for grouped bars.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	"github.com/perses/perses/go-sdk/dashboard"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	bar "github.com/perses/plugins/barchart/sdk/go"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddPanelGroup("Resource usage",
			panelgroup.AddPanel("Container memory",
				bar.Chart(
					bar.Calculation(common.LastCalculation),
					bar.Format(common.Format{
						Unit: common.BytesUnit,
					}),
					bar.SortingBy(bar.AscSort),
					bar.WithMode(bar.PercentageMode),
					bar.WithOrientation(bar.VerticalOrientation),
					bar.WithGroupBy([]string{"job"}),
					bar.WithStacked(true),
				),
			),
		),
	)
}
```
