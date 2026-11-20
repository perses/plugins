// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"strings"
	"github.com/perses/shared/cue/common"
)

kind: "AzureMetricsBatchQuery"
spec: close({
	common.#datasourceSelector & {_kind: "AzureRegionalMetricsDatasource"}
	subscriptionId: =~#uuidRegex | =~common.#variableSyntaxRegex
	resourceIds: [...=~#resourceIdRegex | =~common.#variableSyntaxRegex]
	metricNamespace: =~#metricNamespaceRegex
	metricNames: [...=~#metricNameRegex]
	aggregation?: [...#aggregationEnum]
	filter?:         strings.MinRunes(1) | =~common.#variableSyntaxRegex
	interval?:       =~#intervalRegex
	singlePoint?:    bool
	flattenMetrics?: bool
	top?:            int & >0
	orderBy?:        strings.MinRunes(1)
	rollupBy?:       strings.MinRunes(1)
})

#intervalRegex:        "^P(\\d+Y)?(\\d+M)?(\\d+D)?(T(\\d+H)?(\\d+M)?(\\d+S)?)?$"
#uuidRegex:            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
#resourceIdRegex:      "^(/.+)+$"
#metricNameRegex:      "^[\\w\\s.\\-/]+$"
#metricNamespaceRegex: "^[\\w\\s.\\-/]+$"
#aggregationEnum:      "average" | "count" | "maximum" | "minimum" | "total"
