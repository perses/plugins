# LogsTable Go SDK

## Constructor

```golang
package main

import logstable "github.com/perses/plugins/logstable/sdk/go"

var options []logstable.Option
logstable.LogsTable(options...)
```

Need a list of options.

## Default options

- None

## Available options

### AllowWrap

```golang
package main

import logstable "github.com/perses/plugins/logstable/sdk/go"

logstable.AllowWrap(true)
```

Enable or disable text wrapping in log entries. When enabled, long log lines will wrap to multiple lines for better readability.

### EnableDetails

```golang
package main

import logstable "github.com/perses/plugins/logstable/sdk/go"

logstable.EnableDetails(true)
```

Enable or disable detailed view for log entries. When enabled, users can expand log entries to see additional details and metadata.

### ShowTime

```golang
package main

import logstable "github.com/perses/plugins/logstable/sdk/go"

logstable.ShowTime(true)
```

Control whether to display timestamps for log entries. When enabled, each log entry will show its timestamp.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("Logs Dashboard",
		dashboard.AddPanel("Application Logs",
			panel.New(
				logstable.LogsTable(
					logstable.AllowWrap(true),
					logstable.EnableDetails(true),
					logstable.ShowTime(true),
				),
			),
		),
	)
}```
```
