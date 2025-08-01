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

package variable

import (
	listVarBuilder "github.com/perses/perses/cue/dac-utils/variable/list"
)

// The Prometheus Variable builder helps creating any kind of prometheus variable in the format expected by Perses.
// Parameters:
// - every parameter from listVarBuilder
// - (Optional) `#datasourceName`: the name of the datasource to query
// Output:
// - `variable`: the variable object

// include the definitions of listVarBuilder at the root
listVarBuilder

#datasourceName?: string

variable: listVarBuilder.variable & {
	spec: {
		plugin: {
			spec: {
				datasource: {
					kind: "PrometheusDatasource"
					if #datasourceName != _|_ {
						name: #datasourceName
					}
				}
			}
		}
	}
}
