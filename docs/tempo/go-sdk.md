# Tempo Go SDK

## Datasource

### Constructor

```golang
package main

import tempo "github.com/perses/plugins/tempo/sdk/go/datasource"

var options []tempo.Option
tempo.Datasource(options...)
```

### Available options

#### DirectURL

```golang
package main

import tempo "github.com/perses/plugins/tempo/sdk/go/datasource"

tempo.DirectURL("https://tempo.example.com")
```

Set the direct URL to the Tempo instance.

#### Proxy

```golang
package main

import (
    tempo "github.com/perses/plugins/tempo/sdk/go/datasource"
    "github.com/perses/perses/pkg/model/api/v1/datasource/http"
)

tempo.Proxy(&http.Proxy{
    Kind: "HTTPProxy",
    Spec: http.ProxySpec{
        URL: "https://tempo.example.com",
    },
})
```

Configure proxy settings for the Tempo datasource.
