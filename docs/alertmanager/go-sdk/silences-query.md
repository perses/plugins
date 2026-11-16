# Alertmanager Silences Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/silences"

var options []silences.Option
silences.SilencesQuery(options...)
```

Need a list of options.

## Default options

- None

## Available options

#### Datasource

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/silences"

silences.Datasource("MyAlertmanagerDatasource")
```

Define the datasource the query will use.

#### Filters

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/silences"

silences.Filters(`team="platform"`)
```

Define the label matchers used to filter the silences.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/alertmanager/sdk/go/query/silences"
	"github.com/perses/spec/go/plugin"
)

func main() {
	dashboard.New("Alertmanager Dashboard",
		dashboard.AddPanelGroup("Silences",
			panelgroup.AddPanel("Platform silences",
				panel.Plugin(plugin.Plugin{Kind: "SilenceTable", Spec: map[string]any{}}),
				panel.AddQuery(
					silences.SilencesQuery(
						silences.Datasource("MyAlertmanagerDatasource"),
						silences.Filters(`team="platform"`),
					),
				),
			),
		),
	)
}
```

The Go SDK doesn't provide a builder for the `SilenceTable` panel yet, so this example sets the panel plugin with `panel.Plugin`.
