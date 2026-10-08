# CloudWatch Datasource Builder

## Constructor

```golang
import "github.com/perses/plugins/cloudwatch/sdk/go/datasource"

var options []datasource.Option
datasource.CloudWatch("eu-west-3", "cloudwatch-sigv4", options...)
```

Define a datasource querying the CloudWatch API of a region, through the HTTP proxy of the Perses server.
The second parameter is the name of the secret holding the `sigv4` configuration (with the service name `monitoring`)
used by the Perses server to sign the requests.

## Default options

- URL: `https://monitoring.<region>.amazonaws.com`
- Allowed endpoint: `POST ^/$`

## Available options

#### URL

```golang
import "github.com/perses/plugins/cloudwatch/sdk/go/datasource"

datasource.URL("https://vpce-0123456789abcdef0-abcdefgh.monitoring.eu-west-3.vpce.amazonaws.com")
```

Replace the URL of the CloudWatch API, for example to use a VPC endpoint. It must use HTTPS.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"

	cloudwatchDs "github.com/perses/plugins/cloudwatch/sdk/go/datasource"
)

func main() {
	dashboard.New("CloudWatch Dashboard",
		dashboard.AddDatasource("cloudwatch", cloudwatchDs.CloudWatch("eu-west-3", "cloudwatch-sigv4")),
	)
}
```
