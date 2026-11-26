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

package timeseries

import (
	"encoding/json"
	"testing"
	"time"
)

func TestClickHouseTimeSeriesQueryMarshalsItsOptions(t *testing.T) {
	option := ClickHouseTimeSeriesQuery(
		"SELECT time, ServiceName, value FROM metrics",
		Datasource("clickhouse"),
		SeriesNameFormat("{{ServiceName}}"),
		ExemplarQuery("SELECT time, value, ServiceName, trace_id FROM exemplars"),
		MinStep(time.Minute),
	)
	if option.Error != nil {
		t.Fatal(option.Error)
	}
	got, err := json.Marshal(option.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseTimeSeriesQuery","spec":{"datasource":{"kind":"ClickHouseDatasource","name":"clickhouse"},"query":"SELECT time, ServiceName, value FROM metrics","seriesNameFormat":"{{ServiceName}}","exemplarQuery":"SELECT time, value, ServiceName, trace_id FROM exemplars","minStep":"1m"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestClickHouseTimeSeriesQueryOmitsUnsetOptions(t *testing.T) {
	got, err := json.Marshal(ClickHouseTimeSeriesQuery("SELECT 1 AS value").Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseTimeSeriesQuery","spec":{"query":"SELECT 1 AS value"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
