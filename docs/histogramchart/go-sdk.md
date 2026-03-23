# HistogramChart Go SDK

## Constructor

```golang
package main

import histogram "github.com/perses/plugins/histogramchart/sdk/go"

var options []histogram.Option
histogram.Chart(options...)
```

Need a list of options.

## Default options

- Format: `{Unit: DecimalUnit, DecimalPlaces: 2}`

## Available options

### Format

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	histogram "github.com/perses/plugins/histogramchart/sdk/go"
)

histogram.Format(common.Format{Unit: &common.BytesUnit, DecimalPlaces: 1})
```

Define the format for histogram values.

### Min

```golang
package main

import histogram "github.com/perses/plugins/histogramchart/sdk/go"

histogram.Min(0.0)
```

Set the minimum value for the histogram range.

### Max

```golang
package main

import histogram "github.com/perses/plugins/histogramchart/sdk/go"

histogram.Max(100.0)
```

Set the maximum value for the histogram range.

### Thresholds

```golang
package main

import (
	"github.com/perses/perses/go-sdk/common"
	histogram "github.com/perses/plugins/histogramchart/sdk/go"
)

histogram.Thresholds(common.Thresholds{
	Steps: []common.ThresholdStep{
		{Value: 50.0, Color: "#FF0000"},
		{Value: 80.0, Color: "#FFFF00"},
	},
})
```

Define threshold values and colors for the histogram.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	"github.com/perses/perses/go-sdk/common"
	histogram "github.com/perses/plugins/histogramchart/sdk/go"
)

func main() {
	dashboard.New("Histogram Dashboard",
		dashboard.AddPanel("Response Time Distribution",
			panel.New(
				histogram.Chart(
					histogram.Format(common.Format{Unit: &common.TimeUnit, DecimalPlaces: 2}),
					histogram.Min(0.0),
					histogram.Max(5.0),
					histogram.Thresholds(common.Thresholds{
						Steps: []common.ThresholdStep{
							{Value: 1.0, Color: "#00FF00"},
							{Value: 3.0, Color: "#FFFF00"},
							{Value: 5.0, Color: "#FF0000"},
						},
					}),
				),
			),
		),
	)
}```
```
