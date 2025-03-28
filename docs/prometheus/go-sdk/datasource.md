# Prometheus Datasource Builder

## Constructor

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

var options []datasource.Option
datasource.Prometheus(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

datasource.DirectURL("https://prometheus.demo.do.prometheus.io")
```

Set Prometheus plugin for the datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/prometheus/sdk/go/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Set Prometheus plugin for the datasource with a proxy URL, useful for bypassing. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	promDs "github.com/perses/plugins/prometheus/sdk/go/datasource"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddDatasource("prometheusDemo", promDs.Prometheus(promDs.DirectURL("https://prometheus.demo.do.prometheus.io/"))),
	)
}
```
