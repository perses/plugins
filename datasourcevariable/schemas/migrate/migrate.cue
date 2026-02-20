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

package migrate

import (
	lokiDatasource "github.com/perses/plugins/loki/schemas/datasources:model"
	prometheusDatasource "github.com/perses/plugins/prometheus/schemas/datasource:model"
	pyroscopeDatasource "github.com/perses/plugins/pyroscope/schemas/datasource:model"
	tempoDatasource "github.com/perses/plugins/tempo/schemas/datasource:model"
)

#grafanaVar: {
	type: "datasource"
	query: string
	...
}

// key = Grafana kind, value = Perses kind
#kindMapping: {
	"loki":                         lokiDatasource.#kind
	"prometheus":                   prometheusDatasource.#kind
	"grafana-pyroscope-datasource": pyroscopeDatasource.#kind
	"tempo":                        tempoDatasource.#kind
}

kind: "DatasourceVariable"
spec: {
	datasourcePluginKind: *#kindMapping[#grafanaVar.query] | "not-supported-\(#grafanaVar.query)"
}
