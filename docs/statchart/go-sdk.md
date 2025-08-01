# StatChart Panel Builder

## Constructor

```golang
import "github.com/perses/plugins/statchart/sdk/go"

var options []stat.Option
stat.Chart(options...)
```

Need a list of options.

## Default options

- Calculation(): last

## Available options

### Calculation

```golang
import (
	"github.com/perses/perses/go-sdk/common"
    "github.com/perses/plugins/statchart/sdk/go"
)

stat.Calculation(common.Last)
```

Define the chart calculation.

### Format

```golang
import (
    "github.com/perses/perses/go-sdk/common"
    "github.com/perses/plugins/statchart/sdk/go"
)

stat.Format(common.Format{...})
```

Define the chart format.

### Thresholds

```golang
import (
    "github.com/perses/perses/go-sdk/common"
    "github.com/perses/plugins/statchart/sdk/go"
)

stat.Thresholds(common.Thresholds{...})
```

Define chart thresholds.

### WithSparkline

```golang
import "github.com/perses/plugins/statchart/sdk/go" 

stat.WithSparkline(stat.Sparkline{...})
```

Define the sparkline of the chart.

### ValueFontSize

```golang
import "github.com/perses/plugins/statchart/sdk/go"

stat.ValueFontSize(12)
```

Define the font size of the value.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/statchart/sdk/go"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddPanelGroup("Resource usage",
			panelgroup.AddPanel("Container memory",
				stat.Chart(
					stat.WithSparkline(stat.Sparkline{
						Color: "#e65013",
						Width: 1,
					}),
				),
			),
		),
	)
}
```
