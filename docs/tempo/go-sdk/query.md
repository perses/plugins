# Tempo Query Go SDK

This document describes how to use the Go library to create `TempoTraceQuery` configurations programmatically.

## Import

```go
import "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"
```

## Builder

### New

`New() *Builder`

Creates a new `TempoTraceQuery` configuration builder.

Example:

```go
query := query.New().
	TraceID("abc123def456").
	Build()
```

### Methods

#### TraceID

`TraceID(id string) *Builder`

Sets the trace ID to query from Tempo.

Parameters:

* `id` - The trace ID to search for (e.g., "abc123def456789")

Example:

```go
query := query.New().
	TraceID("abc123def456789").
	Build()
```

#### Build

`Build() *QueryResource`

Builds and returns the final `TempoTraceQuery` configuration.

Returns a pointer to `QueryResource` that can be used in panel configurations.

## Complete Example

```go
package main

import (
	"github.com/perses/perses-plugins/tempo/sdk/go/v1/query"
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panels/tracetable"
)

func main() {
	// Create Tempo trace query
	tempoQuery := query.New().
		TraceID("abc123def456789").
		Build()

	// Create trace table panel with Tempo query
	panel := tracetable.New("Trace Details").
		AddQuery(tempoQuery).
		Build()

	// Create dashboard
	dashboard.New("tempo-dashboard").
		AddPanel(panel).
		Build()
}
```

## Usage with Trace Panels

The Tempo query plugin works seamlessly with trace-related panels:

### TraceTable Panel

```go
import (
    "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"
    "github.com/perses/perses/go-sdk/panels/tracetable"
)

tempoQuery := query.New().
    TraceID("your-trace-id").
    Build()

tracePanel := tracetable.New("Trace Analysis").
    AddQuery(tempoQuery).
    Build()
```

### TracingGanttChart Panel

```go
import (
    "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"
    "github.com/perses/perses/go-sdk/panels/tracingganttchart"
)

tempoQuery := query.New().
    TraceID("your-trace-id").
    Build()

ganttPanel := tracingganttchart.New("Trace Timeline").
    AddQuery(tempoQuery).
    Build()
```
