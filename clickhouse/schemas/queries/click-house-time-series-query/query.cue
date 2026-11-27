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

package model

import (
	"strings"
	"github.com/perses/shared/cue/common"
	ds "github.com/perses/plugins/clickhouse/schemas/datasources/click-house-datasource:model"
)

kind: "ClickHouseTimeSeriesQuery"
spec: close({
	ds.#selector
	query: strings.MinRunes(1)
	// Name of the series, with the labels of the series between double braces, e.g. "{{ServiceName}}".
	seriesNameFormat?: string
	// Query returning the exemplars of the series: a time column, a "value" column, the label columns of the
	// series and the labels of the exemplars, e.g. "trace_id".
	exemplarQuery?: string
	// Lower bound of the interval of the query, which is the value of the "$__interval_s" family of macros:
	// a duration, e.g. "1m", or a variable holding one.
	minStep?: (=~#durationRegex & !="") | =~common.#variableSyntaxRegex
})

#durationRegex: "^(\\d+y)?(\\d+w)?(\\d+d)?(\\d+h)?(\\d+m)?(\\d+s)?(\\d+ms)?$"
