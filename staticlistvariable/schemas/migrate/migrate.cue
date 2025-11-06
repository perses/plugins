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
	"strings"
)

#grafanaVar: {
	type: "custom" | "interval"
	options?: [...{
		text: string
		value: string
	}]
    if options == _|_ {
      query: string
    }
	...
}

kind: "StaticListVariable"
spec: {
	if #grafanaVar.options != _|_ {
		values: [for option in #grafanaVar.options {
			[// switch
				if option.text != option.value {
					label: strings.TrimSpace(option.text)
					value: strings.TrimSpace(option.value)
				},
				strings.TrimSpace(option.value),
			][0]
		}]
	}
	if #grafanaVar.options == _|_ && #grafanaVar.query != _|_ {
		values: [for interval in strings.Split(#grafanaVar.query, ",") {
			strings.TrimSpace(interval)
		}]
	}
}
