// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sdk

import (
	"encoding/json"
	"testing"

	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	cloudwatchDatasource "github.com/perses/plugins/cloudwatch/sdk/go/datasource"
	timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"
	dimensionvalues "github.com/perses/plugins/cloudwatch/sdk/go/variable/dimension-values"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboard(t *testing.T) {
	builder, err := dashboard.New("cloudwatch",
		dashboard.ProjectName("production"),
		dashboard.AddDatasource("cloudwatch", cloudwatchDatasource.CloudWatch("eu-west-3", "cloudwatch-sigv4")),
		dashboard.AddVariable("instance", listvariable.List(
			dimensionvalues.CloudWatchDimensionValues("AWS/EC2", "InstanceId",
				dimensionvalues.Datasource("cloudwatch"),
				dimensionvalues.MetricName("CPUUtilization"),
			),
			listvariable.DisplayName("Instance"),
		)),
		dashboard.AddPanelGroup("EC2",
			panelgroup.AddPanel("CPU",
				panel.AddQuery(timeseries.CloudWatchTimeSeriesQuery(
					timeseries.Datasource("cloudwatch"),
					timeseries.Metric("m1", timeseries.MetricStat{
						Namespace:  "AWS/EC2",
						Name:       "CPUUtilization",
						Dimensions: map[string]string{"InstanceId": "$instance"},
						Statistic:  "Average",
						Period:     60,
					}),
					timeseries.Hidden(),
					timeseries.Expression("e1", "m1 * 2"),
					timeseries.Label("CPU x2"),
				)),
			),
		),
	)
	require.NoError(t, err)
	data, err := json.Marshal(builder.Dashboard)
	require.NoError(t, err)
	result := string(data)
	assert.Contains(t, result, `"proxy":{"kind":"HTTPProxy","spec":{"url":"https://monitoring.eu-west-3.amazonaws.com","allowedEndpoints":[{"endpointPattern":"^/$","method":"POST"}],"secret":"cloudwatch-sigv4"}}`)
	assert.Contains(t, result, `"kind":"CloudWatchDimensionValuesVariable","spec":{"datasource":{"kind":"CloudWatchDatasource","name":"cloudwatch"},"namespace":"AWS/EC2","metricName":"CPUUtilization","dimensionKey":"InstanceId"}`)
	assert.Contains(t, result, `"queries":[{"id":"m1","metric":{"namespace":"AWS/EC2","name":"CPUUtilization","dimensions":{"InstanceId":"$instance"},"statistic":"Average","period":60},"returnData":false},{"id":"e1","expression":"m1 * 2","label":"CPU x2"}]`)
}

func TestInvalidOptions(t *testing.T) {
	_, err := dashboard.New("cloudwatch", dashboard.AddDatasource("cloudwatch", cloudwatchDatasource.CloudWatch("https://example.com", "cloudwatch-sigv4")))
	assert.Error(t, err)
	_, err = dashboard.New("cloudwatch", dashboard.AddDatasource("cloudwatch", cloudwatchDatasource.CloudWatch("us-east-1", "")))
	assert.Error(t, err)
	_, err = dashboard.New("cloudwatch", dashboard.AddDatasource("cloudwatch", cloudwatchDatasource.CloudWatch("us-east-1", "cloudwatch-sigv4",
		cloudwatchDatasource.URL("http://localhost:4566"))))
	assert.Error(t, err)
	_, err = dashboard.New("cloudwatch", dashboard.AddPanelGroup("EC2", panelgroup.AddPanel("CPU",
		panel.AddQuery(timeseries.CloudWatchTimeSeriesQuery(timeseries.Metric("m1", timeseries.MetricStat{Namespace: "AWS/EC2", Name: "CPUUtilization", Statistic: "Average", Period: 90}))))))
	assert.Error(t, err)
}

func TestEndpoint(t *testing.T) {
	assert.Equal(t, "https://monitoring.us-east-1.amazonaws.com", cloudwatchDatasource.Endpoint("us-east-1"))
	assert.Equal(t, "https://monitoring.cn-north-1.amazonaws.com.cn", cloudwatchDatasource.Endpoint("cn-north-1"))
}
