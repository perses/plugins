// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"list"
	"math"
	"strings"
	ds "github.com/perses/plugins/cloudwatch/schemas/datasources/cloudwatch:model"
)

kind: "CloudWatchTimeSeriesQuery"
spec: close({
	ds.#selector
	queries: list.MinItems(1) & list.MaxItems(20) & [...#query]
})

#name: strings.MinRunes(1) & strings.MaxRunes(255)

#query: close({
	id:          =~"^[a-z][a-zA-Z0-9_]{0,63}$"
	label?:      strings.MaxRunes(255)
	returnData?: bool
	metric?: close({
		namespace: #name
		name:      #name
		dimensions?: {[#name]: #name}
		statistic: =~"^(Average|Sum|Minimum|Maximum|SampleCount|p([0-9]|[1-9][0-9])(\\.[0-9]{1,2})?|p100)$"
		// period is the minimum period in seconds. It is increased for long time ranges.
		period: int & >=60 & <=86400 & math.MultipleOf(60)
	})
	expression?: strings.MinRunes(1) & strings.MaxRunes(1024)
	if metric == _|_ {
		expression!: _
	}
	if metric != _|_ {
		expression?: _|_
	}
})
