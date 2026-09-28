# Tempo Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/tempo/sdk/go/datasource"

var options []datasource.Option
datasource.Tempo(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/tempo/sdk/go/datasource"

datasource.DirectURL("http://tempo.example.com:3200")
```

Set Tempo plugin for the datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/plugins/tempo/sdk/go/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Set Tempo plugin for the datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	tempoDs "github.com/perses/plugins/tempo/sdk/go/datasource"
)

func main() {
	dashboard.New("Tempo Dashboard",
		dashboard.AddDatasource("tempoMain", tempoDs.Tempo(tempoDs.DirectURL("http://tempo.example.com:3200"))),
	)
}
```
