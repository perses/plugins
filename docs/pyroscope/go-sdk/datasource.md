# Pyroscope Datasource Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

var options []datasource.Option
datasource.Pyroscope(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

datasource.DirectURL("http://pyroscope.example.com:4040")
```

Configure the access to the Pyroscope datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the Pyroscope datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

#### Minimal Step

```golang
import (
	"time"

	"github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"
)

datasource.MinStep(30 * time.Second)
```

Configure the lower bound for the timeline resolution (step) of profile queries. Defaults to `15s` when unset.
Set it at or above your Pyroscope ingestion interval, so zooming in does not request a finer resolution than the
data actually has and leave gaps in the timeline. Values are rounded up to whole seconds, since the underlying
Pyroscope `SelectSeries` API only accepts integer seconds.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	pyroDs "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/datasource"
)

func main() {
	dashboard.New("Pyroscope Dashboard",
		dashboard.AddDatasource("pyroscopeMain", pyroDs.Pyroscope(pyroDs.DirectURL("http://pyroscope.example.com:4040"))),
	)
}
```
