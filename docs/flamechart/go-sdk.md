# FlameChart Go SDK

## Constructor

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

var options []flamechart.Option
flamechart.Chart(options...)
```

Need a list of options.

## Available options

### DefinePalette

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

flamechart.DefinePalette(flamechart.ValuePaletteMode)
flamechart.DefinePalette(flamechart.PackagePaletteMode)
```

Define the color palette mode for the flame graph. Available modes:
- `ValuePaletteMode`: Colors based on values (duration, frequency, etc.)
- `PackagePaletteMode`: Colors based on package or module names

### ShowSettings

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

flamechart.ShowSettings()
```

Enable the settings panel in the flame chart visualization. This allows users to adjust display options and configuration.

### ShowSeries

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

flamechart.ShowSeries()
```

Enable the series panel in the flame chart visualization. This displays series information and legends.

### ShowTable

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

flamechart.ShowTable()
```

Enable the table view in the flame chart visualization. This provides a tabular representation of the profiling data alongside the flame graph.

### ShowFlameGraph

```golang
package main

import flamechart "github.com/perses/plugins/flamechart/sdk/go"

flamechart.ShowFlameGraph()
```

Enable the main flame graph visualization. This displays the interactive flame graph for analyzing profiling data.

## Complete example

```golang
package main

import (
    "github.com/perses/perses/go-sdk/dashboard"
    "github.com/perses/perses/go-sdk/panel"
    flamechart "github.com/perses/plugins/flamechart/sdk/go"
)

dashboard.New("My Dashboard",
    dashboard.AddPanel("Flame Graph Analysis",
        panel.New(
            flamechart.Chart(
                flamechart.DefinePalette(flamechart.ValuePaletteMode),
                flamechart.ShowSettings(),
                flamechart.ShowSeries(),
                flamechart.ShowTable(),
                flamechart.ShowFlameGraph(),
            ),
        ),
    ),
)
```
