# ClickStack Alerts Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

var options []alerts.Option
alerts.AlertsQuery(options...)
```

Need a list of options. Without options, the query lists the firing and the pending alerts.

## Default options

- None

## Available options

#### Datasource

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

alerts.Datasource("MyClickStackDatasource")
```

Define the datasource the query will use.

#### States

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

alerts.States(alerts.StateAlert, alerts.StatePending, alerts.StateOK)
```

Define the states of the alerts to list: `StateAlert` (firing), `StatePending` and `StateOK`. By default, the firing and the pending alerts are listed.

#### Sources

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

alerts.Sources(alerts.SourceSavedSearch, alerts.SourceTile)
```

Define what the alerts to list watch: `SourceSavedSearch`, `SourceTile` (a tile of a dashboard) or `SourceInline` (their own chart). By default, all the alerts are listed.

#### Tags

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

alerts.Tags("team:$team", "production")
```

List the alerts with one of the tags. Variables are supported: a variable with several values is as many tags.

#### Search

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"

alerts.Search("checkout")
```

List the alerts whose name contains the text. Variables are supported.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	alerttable "github.com/perses/plugins/alertmanager/sdk/go/panel"
	"github.com/perses/plugins/clickhouse/sdk/go/clickstack/query/alerts"
)

func main() {
	dashboard.New("ClickStack Alerts Dashboard",
		dashboard.AddPanelGroup("Alerts",
			panelgroup.AddPanel("Alerts of the platform team",
				alerttable.AlertTable(),
				panel.AddQuery(
					alerts.AlertsQuery(
						alerts.States(alerts.StateAlert, alerts.StatePending, alerts.StateOK),
						alerts.Tags("team:platform"),
					),
				),
			),
		),
	)
}
```
