// Copyright 2023 The Perses Authors
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
	"github.com/perses/perses/cue/common"
)

kind: "PieChart"
spec: close({
	 // TODO: create a new common definition for this altered legend once perses/perses/cue/common has been moved outside of perses/perses
	legend?:        {
		position: "bottom" | "right"
		mode?: "list" | "table"
		size?: "small" | "medium"
		values?: [..."abs" | "relative"]
	}
	calculation:    common.#calculation
	format?:        common.#format
	sort?:          "asc" | "desc"
	mode?:          "value" | "percentage"
	showLabels?:    bool
	radius:         number
	colorPalette?: 	[...string]
})
