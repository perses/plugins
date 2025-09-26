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

#var: _

if #var.type == "custom" || #var.type == "interval" {
	kind: "StaticListVariable"
	spec: {
		if #var.options != _|_ {
			values: [for option in #var.options {
				[// switch
					if option.text != option.value {
						label: strings.TrimSpace(option.text)
						value: strings.TrimSpace(option.value)
					},
					strings.TrimSpace(option.value),
				][0]
			}]
		}
		if #var.options == _|_ && #var.query != _|_ {
			values: [for interval in strings.Split(#var.query, ",") {
				strings.TrimSpace(interval)
			}]
		}
	}
}
