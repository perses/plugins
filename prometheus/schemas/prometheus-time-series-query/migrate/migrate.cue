// Copyright 2025 The Perses Authors
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

package migrate

#target: {
	// /!\ Best-effort conversion logic that may wrongly convert not-prometheus queries to PrometheusTimeSeriesQuery:
	// Ideally we should rely on datasource.type = "prometheus" to identify prometheus queries. But in some cases,
	// this information is not be available. Thus the condition relies on the presence of the "expr" field, that
	// likely indicates that this is a prometheus query.
	datasource?: {
		uid: string
	}
	expr: string
	legendFormat?: string
	interval?: string
	...
}

kind: "PrometheusTimeSeriesQuery"
spec: {
    if #target.datasource != _|_ {
        datasource: {
            kind: "PrometheusDatasource"
            name: #target.datasource.uid
        }
    }
    query:         #target.expr
    #legendFormat: *#target.legendFormat | "__auto"
    if #legendFormat != "__auto" {
        seriesNameFormat: #legendFormat
    }
    if #target.interval != _|_ {
        minStep: #target.interval
    }
}