# Loki Datasource Go SDK

This document describes how to use the Go library to create `LokiDatasource` configurations programmatically.

## Import

```go
import "github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"
```

## Builder

### New

`New() *Builder`

Creates a new `LokiDatasource` configuration builder.

Example:

```go
ds := datasource.New().
	DirectURL("http://loki.example.com:3100").
	Build()
```

### Methods

#### DirectURL

`DirectURL(url string) *Builder`

Sets the direct URL to the Loki instance.

Parameters:

* `url` - The URL to the Loki instance (e.g., "http://loki.example.com:3100")

Example:

```go
ds := datasource.New().
	DirectURL("http://loki.example.com:3100").
	Build()
```

#### ProxyURL

`ProxyURL(url string) *Builder`

Sets a proxy URL for accessing the Loki instance through the Perses proxy feature.

Parameters:

* `url` - The proxy URL path (e.g., "/proxy/loki")

Example:

```go
ds := datasource.New().
	ProxyURL("/proxy/loki").
	Build()
```

#### Build

`Build() *DatasourceResource`

Builds and returns the final `LokiDatasource` configuration.

Returns a pointer to `DatasourceResource` that can be used in dashboard configurations.

## Complete Example

```go
package main

import (
	"github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/project"
)

func main() {
	// Create Loki datasource
	lokiDatasource := datasource.New().
		DirectURL("http://loki.example.com:3100").
		Build()

	// Create dashboard with Loki datasource
	dashboard.New("log-analysis").
		AddDatasource("loki", lokiDatasource).
		Build()
}
```

## Proxy Configuration

When using the proxy feature, configure your Loki datasource to route through Perses:

```go
lokiDatasource := datasource.New().
	ProxyURL("/proxy/loki").
	Build()
```

This enables Perses to control access to your Loki instance according to your security policies.
