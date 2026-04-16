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

import "strings"
import ds "github.com/perses/plugins/jaeger/schemas/datasource:model"

kind: "JaegerTraceQuery"
spec: close({
	ds.#selector
	traceId?:     strings.MinRunes(1)
	service?:     strings.MinRunes(1)
	operation?:   strings.MinRunes(1)
	spanKind?:    strings.MinRunes(1)
	tags?:        strings.MinRunes(1)
	minDuration?: strings.MinRunes(1)
	maxDuration?: strings.MinRunes(1)
	limit?:       number

	if traceId == _|_ {
		service: strings.MinRunes(1)
	}
})
