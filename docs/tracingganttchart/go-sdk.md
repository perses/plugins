# TracingGanttChart Go SDK

## Constructor

```golang
package main

import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

var options []tracinggantt.Option
tracinggantt.Chart(options...)
```

## Default options

- None

## Available options

### WithSelection

```golang
import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

tracinggantt.WithSelection(true)
```

Enable the selection of spans with checkboxes. The checked spans are exposed as the panel selection, used by the actions displayed in the panel header.

### WithActions

```golang
import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

tracinggantt.WithActions(tracinggantt.Actions{
	Enabled:         true,
	DisplayInHeader: true,
	DisplayWithItem: true,
	ActionsList:     []tracinggantt.ItemAction{...},
})
```

Define the item actions, executed with the data of the checked spans (`DisplayInHeader`) or of the span opened in the detail pane (`DisplayWithItem`).
`Enabled` must be `true` for the actions to be displayed. An error is returned if an action has no name, if an event action has no event name, or if a webhook action has no URL.

See the [README](./README.md#item-actions) for the data passed to the actions.

#### EventAction

```golang
import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

tracinggantt.EventAction("Show logs", "perses:span-logs")
```

Create an enabled action dispatching a `CustomEvent` on `window`.

#### WebhookAction

```golang
import tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"

tracinggantt.WebhookAction("Report span", "https://example.com/spans")
```

Create an enabled action sending a `POST` request.

The returned `ItemAction` can be customized, e.g. with `Icon`, `ConfirmMessage`, `BodyTemplate`, `BatchMode` (`IndividualBatchMode` or `BatchBatchMode`),
and for webhook actions `Method`, `ContentType` and `Headers`.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"
)

func main() {
	showLogs := tracinggantt.EventAction("Show logs", "perses:span-logs")
	showLogs.Icon = "link"
	showLogs.BodyTemplate = `{"traceId": "${__data.fields["span.traceId"]}", "spanId": "${__data.fields["span.spanId"]}"}`

	reportSpans := tracinggantt.WebhookAction("Report spans", "https://example.com/spans")
	reportSpans.BatchMode = tracinggantt.BatchBatchMode
	reportSpans.ContentType = tracinggantt.JSONContentType
	reportSpans.BodyTemplate = `${__data:json}`

	dashboard.New("Tracing Gantt Chart Dashboard",
		dashboard.AddPanel("Trace Timeline",
			panel.New(
				tracinggantt.Chart(
					tracinggantt.WithSelection(true),
					tracinggantt.WithActions(tracinggantt.Actions{
						Enabled:         true,
						DisplayInHeader: true,
						DisplayWithItem: true,
						ActionsList:     []tracinggantt.ItemAction{showLogs, reportSpans},
					}),
				),
			),
		),
	)
}
```
