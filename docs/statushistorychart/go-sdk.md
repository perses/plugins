# StatusHistoryChart Go SDK

## Constructor

```golang
package main

import statushistory "github.com/perses/plugins/statushistorychart/sdk/go"

var options []statushistory.Option
statushistory.Chart(options...)
```

Need a list of options.

## Default options

- None

## Available options

### WithLegend

```golang
package main

import statushistory "github.com/perses/plugins/statushistorychart/sdk/go"

statushistory.WithLegend(statushistory.Legend{
	Position: statushistory.BottomPosition,
	Mode:     statushistory.ListMode,
	Size:     statushistory.SmallSize,
})
```

Define legend properties for the status history chart. Available positions: `BottomPosition`, `RightPosition`. Available modes: `ListMode`, `TableMode`. Available sizes: `SmallSize`, `MediumSize`.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	statushistory "github.com/perses/plugins/statushistorychart/sdk/go"
)

func main() {
	dashboard.New("Status History Dashboard",
		dashboard.AddPanel("Service Status Over Time",
			panel.New(
				statushistory.Chart(
					statushistory.WithLegend(statushistory.Legend{
						Position: statushistory.RightPosition,
						Mode:     statushistory.ListMode,
						Size:     statushistory.MediumSize,
					}),
				),
			),
		),
	)
}```
```
