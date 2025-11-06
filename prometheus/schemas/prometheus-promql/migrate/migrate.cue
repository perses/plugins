// Copyright 2024 The Perses Authors
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
	"regexp"
)

#promQLRegexp: =~ "^query_result\\(.*\\)$"

#grafanaVar: {
	type: "query"
	query: #promQLRegexp | {
		query: #promQLRegexp
		...
	}
	...
}

_outputPromQLVar: {
	#query: string
	#qResRegexp: "^query_result\\((.*by\\s*\\((\\w+).*)\\)$"

	kind: "PrometheusPromQLVariable"
	spec: {
		if #query =~ #qResRegexp {
			expr:      regexp.FindSubmatch(#qResRegexp, #query)[1]
			labelName: regexp.FindSubmatch(#qResRegexp, #query)[2]
		}
		if #query !~ #qResRegexp {
			expr:      #query
			labelName: "migration_from_grafana_not_supported"
		}
	}
}

if (#grafanaVar.query & string) != _|_ {
	_outputPromQLVar & {#query: #grafanaVar.query}
}
if (#grafanaVar.query & {}) != _|_ {
	_outputPromQLVar & {#query: #grafanaVar.query.query}
}
