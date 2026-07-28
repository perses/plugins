# OpenSearch Log Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

var options []log.Option
log.OpenSearchLogQuery(`source=otel-logs-* | where severityText='ERROR'`, options...)
```

Need to provide the PPL expression and a list of options. The expression cannot be empty.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.Query(`source=otel-logs-* | where severityText='ERROR' | head 20`)
```

Define the PPL query expression for log data.

#### Datasource

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.Datasource("MyOpenSearchDatasource")
```

Define the datasource the query will use.

#### Index

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.Index("otel-logs-*")
```

Define the index or index pattern to read from. It is prepended to the query as a `source=<index>` clause, and ignored when the query already starts with `source=`.

#### TimestampField

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.TimestampField("time")
```

Override which column carries the log timestamp, for indices that do not use `@timestamp`, `timestamp` or `time`. This is also the column used by the automatic time filter, which defaults to `@timestamp`.

#### MessageField

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.MessageField("msg")
```

Override which column becomes the log line, for indices that do not use `message`, `log` or `body`.

#### DisableTimeFilter

```golang
import "github.com/perses/plugins/opensearch/sdk/go/query/log"

log.DisableTimeFilter(true)
```

Stop the panel time range from being injected as a `where` clause on the timestamp field, so the query manages its own time bounds.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	logstable "github.com/perses/plugins/logstable/sdk/go"
	osLog "github.com/perses/plugins/opensearch/sdk/go/query/log"
)

func main() {
	dashboard.New("OpenSearch Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.LogsTable(),
				panel.AddQuery(
					osLog.OpenSearchLogQuery(`where severityText='ERROR' | head 100`,
						osLog.Index("otel-logs-*"),
					),
				),
			),
		),
	)
}
```
