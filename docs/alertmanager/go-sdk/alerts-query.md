# Alertmanager Alerts Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

var options []alerts.Option
alerts.AlertsQuery(options...)
```

Need a list of options.

## Default options

- None

## Available options

#### Datasource

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Datasource("MyAlertmanagerDatasource")
```

Define the datasource the query will use.

#### Filters

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Filters(`severity="critical"`, `team="platform"`)
```

Define the label matchers used to filter the alerts.

#### Active

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Active(true)
```

Define whether to return the active alerts.

#### Silenced

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Silenced(false)
```

Define whether to return the silenced alerts.

#### Inhibited

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Inhibited(false)
```

Define whether to return the inhibited alerts.

#### Unprocessed

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Unprocessed(false)
```

Define whether to return the unprocessed alerts.

#### Receiver

```golang
import "github.com/perses/plugins/alertmanager/sdk/go/query/alerts"

alerts.Receiver("team-a")
```

Define the receiver of the alerts to return.

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
			panelgroup.AddPanel("Critical alerts",
				amPanel.AlertTable(),
				panel.AddQuery(
					alerts.AlertsQuery(
						alerts.Filters(`severity="critical"`),
						alerts.Active(true),
					),
				),
			),
		),
	)
}
```
