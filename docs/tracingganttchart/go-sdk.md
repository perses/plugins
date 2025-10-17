# TracingGanttChart Go SDK

## Constructor

```golang
package main

import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

tracinggantt.Chart()
```

The TracingGanttChart plugin has a simple constructor with no configurable options.

## Default options

- None

## Available options

- None (this plugin currently has no configurable options)

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"
)

func main() {
	dashboard.New("Tracing Gantt Chart Dashboard",
		dashboard.AddPanel("Trace Timeline",
			panel.New(
				tracinggantt.Chart(),
			),
		),
	)
}```
```
