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

#labelValuesRegexp: =~ "^label_values\\(.*\\)$"

#grafanaVar: {
	type: "query"
	query: #labelValuesRegexp | {
		query: #labelValuesRegexp
		...
	}
	...
}

_outputLabelValuesVar: {
	#query: string

	kind: "PrometheusLabelValuesVariable"
	spec: {
		#matches:  regexp.FindSubmatch("^label_values\\(((.*),)?\\s*?([a-zA-Z0-9-_]+)\\)$", #query)
		labelName: #matches[3]
		matchers: [if #matches[2] != "" {#matches[2]}]
	}
}

if (#grafanaVar.query & string) != _|_ {
	_outputLabelValuesVar & {#query: #grafanaVar.query}
}
if (#grafanaVar.query & {}) != _|_ {
	_outputLabelValuesVar & {#query: #grafanaVar.query.query}
}
