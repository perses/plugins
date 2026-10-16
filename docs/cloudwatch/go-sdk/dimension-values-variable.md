# CloudWatch Dimension Values Variable Builder

## Constructor

```golang
import dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"

var options []dimensionvalues.Option
dimensionvalues.CloudWatchDimensionValues("AWS/EC2", "InstanceId", options...)
```

Define a list variable whose options are the values of a dimension (here `InstanceId`) in a namespace (here `AWS/EC2`).

## Default options

- None

## Available options

#### Datasource

```golang
import dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"

dimensionvalues.Datasource("cloudwatch")
```

Define the datasource the variable will use. Without it, the default CloudWatch datasource is used.

#### Metric name

```golang
import dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"

dimensionvalues.MetricName("CPUUtilization")
```

Narrow the discovery to a metric.

#### Dimensions

```golang
import dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"

dimensionvalues.Dimensions(map[string]string{"AutoScalingGroupName": "$asg"})
```

Narrow the discovery to the metrics having these dimension values. The values can use variables.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"

	dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"
)

func main() {
	dashboard.New("CloudWatch Dashboard",
		dashboard.AddVariable("instance", listvariable.List(
			dimensionvalues.CloudWatchDimensionValues("AWS/EC2", "InstanceId",
				dimensionvalues.Datasource("cloudwatch"),
				dimensionvalues.MetricName("CPUUtilization"),
			),
			listvariable.DisplayName("Instance"),
		)),
	)
}
```
