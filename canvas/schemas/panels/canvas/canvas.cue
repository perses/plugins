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
	"github.com/perses/shared/cue/common"
)

kind: "Canvas"
spec: close({
	legend?:                 #legend
	thresholds?:             common.#thresholds
	format?:                 common.#format
	querySettings?:          #querySettings
	edgeDefaultStrokeWidth?: number & >0
	edgeThresholdWidths?: [...#edgeThresholdStep]
	backgrounds?: [...#background]
	nodes?: [...#node]
	edges?: [...#edge]
})

#legend: {
	position: "bottom" | "right"
}

#querySettings: [...{
	queryIndex: int & >=0
	colorMode:  "fixed" | "fixed-single"
	colorValue: =~"^#(?:[0-9a-fA-F]{3}){1,2}$" // hexadecimal color code
}]

#background: {
	id:        string
	name?:     string
	x:         number
	y:         number
	width:     number & >0
	height:    number & >0
	color?:    =~"^#(?:[0-9a-fA-F]{3}){1,2}$"
	opacity?:  number & >=0 & <=1
	image?:    string
	imageFit?: "cover" | "contain" | "stretch"
	global?:   bool
}

#node: {
	id:               string
	x:                number
	y:                number
	width:            number & >0
	height:           number & >0
	kind:             "rectangle" | "icon" | "text"
	label?:           string
	labelPosition?:   "above" | "below" | "left" | "right" | "center"
	labelPadding?:    number & >=0
	icon?:            string
	link?:            string
	background?:      =~"^#(?:[0-9a-fA-F]{3}){1,2}$"
	backgroundImage?: string
	queryIndex?:      int & >=0
	colorMode?:       "threshold" | "fixed"
	color?:           =~"^#(?:[0-9a-fA-F]{3}){1,2}$"
}

#edge: {
	id:                   string
	name?:                string
	source:               string
	target:               string
	sourceAnchor?:        "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	targetAnchor?:        "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
	x2?:                  number
	y2?:                  number
	bidirectional?:       bool
	thicknessMode?:       "fixed" | "threshold"
	strokeWidth?:         number & >0
	sourceQueryIndex?:    int & >=0
	targetQueryIndex?:    int & >=0
	sourceLabelTemplate?: string
	targetLabelTemplate?: string
}

#edgeThresholdStep: {
	value:       number
	strokeWidth: number & >0
}
