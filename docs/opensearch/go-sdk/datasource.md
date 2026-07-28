# OpenSearch Datasource Go SDK

## Constructor

```golang
import "github.com/perses/plugins/opensearch/sdk/go/datasource"

var options []datasource.Option
datasource.OpenSearch(options...)
```

Need a list of options. Exactly one of direct URL or proxy must be provided, in order to work.

## Default options

- None

## Available options

#### Direct URL

```golang
import "github.com/perses/plugins/opensearch/sdk/go/datasource"

datasource.DirectURL("http://opensearch.example.com:9200")
```

Configure the access to the OpenSearch datasource with a direct URL. The browser then calls OpenSearch directly, which requires CORS to be enabled on the cluster.

#### Proxy

```golang
import "github.com/perses/plugins/opensearch/sdk/go/datasource"

datasource.HTTPProxy("http://opensearch.example.com:9200", httpProxyOptions...)
```

Configure the access to the OpenSearch datasource with a proxy URL. More info at [HTTP Proxy](https://perses.dev/perses/docs/dac/go/helper/http-proxy).

This is the recommended setup: requests go through the Perses backend, so the cluster needs no CORS configuration and any credentials stay server-side.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"

	osDs "github.com/perses/plugins/opensearch/sdk/go/datasource"
)

func main() {
	dashboard.New("OpenSearch Dashboard",
		dashboard.AddDatasource("openSearchMain", osDs.OpenSearch(osDs.DirectURL("http://opensearch.example.com:9200"))),
	)
}
```
