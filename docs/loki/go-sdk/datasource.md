# Loki Datasource Builder

## Constructor

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"

var options []datasource.Option
datasource.Loki(options...)
```

Need a list of options. At least direct URL or proxy URL, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"

datasource.DirectURL("http://loki.example.com:3100")
```

Configure the access to the Loki datasource with a direct URL.

#### Proxy

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"

datasource.HTTPProxy("https://current-domain-name.io", httpProxyOptions...)
```

Configure the access to the Loki datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	
	lokiDs "github.com/perses/perses-plugins/loki/sdk/go/v1/datasource"
)

func main() {
	dashboard.New("Loki Dashboard",
		dashboard.AddDatasource("lokiMain", lokiDs.Loki(lokiDs.DirectURL("http://loki.example.com:3100"))),
	)
}
```
