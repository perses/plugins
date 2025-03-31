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

package labelvalues

import (
	labelValuesVar "github.com/perses/plugins/prometheus/schemas/prometheus-label-values:model"
	promVarBuilder "github.com/perses/plugins/prometheus/sdk/cue/variable"
	filterBuilder "github.com/perses/plugins/prometheus/sdk/cue/filter"
)

// The Label Values Variable builder helps creating prometheus label values variables in the format expected by Perses.
// Parameters:
// - every parameter from promVarBuilder
// - (Optional) `#metric`: The name of the source metric to be used. ⚠️ Mandatory if you want to rely on the standard query pattern, thus didn't provide a value to the `#query` parameter.
// - (Optional) `#label`:  The label from which to retrieve the list of values. ⚠️ The filter library does NOT rely on this parameter to build the corresponding matcher, only `#name` is used.
// - (Optional) `#query`:  Custom query to be used for this variable. ⚠️ Mandatory if you didn't provide a value to the `#metric` parameter.
// Output:
// - `variable`: The final variable object, to be passed to the dashboard.

// include the definitions of promVarBuilder at the root
promVarBuilder

#name: _ // this is needed for below reference

// specify the constraints for this variable
#pluginKind: labelValuesVar.kind
#metric:     string
#label:      string | *#name
#query:      string
#dependencies: [...{...}]

filter: {filterBuilder & {#input: #dependencies}}.filter

queryExpr: [// switch
	if #query != _|_ {#query},
	#metric + "{" + filter + "}",
][0]

variable: promVarBuilder.variable & {
	spec: {
		plugin: labelValuesVar & {
			spec: {
				labelName: #label
				matchers: [queryExpr]
			}
		}
	}
}
