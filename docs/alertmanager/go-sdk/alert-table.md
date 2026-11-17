# Alert Table Go SDK

## Constructor

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

var options []amPanel.Option
amPanel.AlertTable(options...)
```

Need a list of options.

## Default options

- None

## Available options

#### Default group by

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.DefaultGroupBy("alertname", "namespace")
```

Define the labels used to group the alerts when the panel loads.

#### Columns

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.Columns(
	amPanel.ColumnDefinition{Name: "severity", Sort: amPanel.AscSort, SortMode: amPanel.SeveritySort},
	amPanel.ColumnDefinition{Name: "namespace", Header: "Namespace"},
)
```

Define the label columns of the table.

#### Deduplication

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.Deduplication(amPanel.DeduplicationConfig{
	Mode:   amPanel.DeduplicationLabels,
	Labels: []string{"alertname", "instance"},
})
```

Define how the alerts returned by several queries are deduplicated.

#### Allowed actions

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.AllowedActions(amPanel.SilenceAction, amPanel.RunbookAction)
```

Define the actions available on each alert.

#### Runbook annotation key

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.RunbookAnnotationKey("runbook")
```

Define the annotation holding the runbook URL of an alert.

#### Label color mappings

```golang
import amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"

amPanel.LabelColorMappings(
	amPanel.LabelColorMapping{
		LabelKey: "severity",
		Mode:     amPanel.SeverityColorMode,
		Overrides: []amPanel.LabelColorOverride{
			{Value: "page", IsRegex: false, Color: "#d32f2f"},
		},
	},
)
```

Define how the values of labels are colored.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	amPanel "github.com/perses/plugins/alertmanager/sdk/go/panel"
	"github.com/perses/plugins/alertmanager/sdk/go/query/alerts"
)

func main() {
	dashboard.New("alertmanager-dashboard",
		dashboard.AddPanelGroup("Alerts",
			panelgroup.AddPanel("Alerts by namespace",
				amPanel.AlertTable(
					amPanel.DefaultGroupBy("namespace"),
					amPanel.AllowedActions(amPanel.SilenceAction),
				),
				panel.AddQuery(
					alerts.AlertsQuery(),
				),
			),
		),
	)
}
```
