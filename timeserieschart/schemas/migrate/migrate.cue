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
	commonMigrate "github.com/perses/perses/cue/common/migrate"
	"strings"
	"strconv"
)

#grafanaType: "timeseries" | "graph"
#panel:       _

// key: grafana line style, value: perses line style
#lineStyleMapping: {
	solid:  "solid"
	dash: "dashed"
	dot: "dotted"
}

kind: "TimeSeriesChart"
spec: {
	// legend
	// NB: no support of former "show" attribute from Grafana, people should migrate to latest Grafana datamodel before migrating to Perses
	#showLegend: *#panel.options.legend.showLegend | true
	if #panel.options.legend != _|_ if #showLegend {
		legend: {
			if #panel.type == "timeseries" {
				position: *(#panel.options.legend.placement & "right") | "bottom"
				mode:     *(#panel.options.legend.displayMode & "table") | "list"
				values: [for calc in #panel.options.legend.calcs
					if (commonMigrate.#mapping.calc[calc] != _|_) {commonMigrate.#mapping.calc[calc]},
				]
			}
			if #panel.type == "graph" {
				#rightSide: *#panel.legend.rightSide | false
				position: [// switch
					if #rightSide {"right"},
					"bottom",
				][0]
				#alignAsTable: *#panel.legend.alignAsTable | false
				mode: [
					if #alignAsTable {"table"},
					"list",
				][0]
				values: [for oldCalc, newCalc in commonMigrate.#mapping.calc
					if #panel.legend[oldCalc] != _|_
					if #panel.legend[oldCalc] == true {
						newCalc
					},
				]
			}
		}
	}

	// yAxis
	#unit: *commonMigrate.#mapping.unit[#panel.fieldConfig.defaults.unit] | null
	if #unit != null {
		yAxis: format: unit: #unit
	}

	#decimal: *#panel.fieldConfig.defaults.decimal | *#panel.fieldConfig.defaults.decimals | null
	if #decimal != null {
		yAxis: format: {
			decimalPlaces: #decimal
			if #unit == null {
				unit: "decimal"
			}
		}
	}

	#min: [// switch
		if (*#panel.fieldConfig.defaults.min | null) != null {
			#panel.fieldConfig.defaults.min
		},
		if (*#panel.fieldConfig.defaults.custom.axisSoftMin | null) != null {
			#panel.fieldConfig.defaults.custom.axisSoftMin
		},
		null,
	][0]
	if #min != null {
		yAxis: min: #min
	}

	#max: [// switch
		if (*#panel.fieldConfig.defaults.max | null) != null {
			#panel.fieldConfig.defaults.max
		},
		if (*#panel.fieldConfig.defaults.custom.axisSoftMax | null) != null {
			#panel.fieldConfig.defaults.custom.axisSoftMax
		},
		null,
	][0]
	if #max != null {
		yAxis: max: #max
	}

	#yAxisLabel: *#panel.fieldConfig.defaults.custom.axisLabel | null
	if #yAxisLabel != null if len(#yAxisLabel) > 0 {
		yAxis: label: #yAxisLabel
	}

	// thresholds
	// -> migrate thresholds only if they are visible
	#steps: *#panel.fieldConfig.defaults.thresholds.steps | null
	#mode:  *#panel.fieldConfig.defaults.custom.thresholdsStyle.mode | "off"
	if #steps != null if #mode != "off" {
		thresholds: {
			// defaultColor: TODO how to fill this one?
			steps: [for _, step in #steps if step.value != _|_ {
				value: [// switch
					if step.value == null {0},
					step.value,
				][0]
				color: *commonMigrate.#mapping.color[step.color] | step.color // TODO how to manage the overrides part?
			}]
		}
	}

	// visual
	#lineWidthRaw: *#panel.fieldConfig.defaults.custom.lineWidth | null
	#lineWidth: [
		if (#lineWidthRaw & string) != _|_ { strconv.Atoi(#lineWidthRaw) },
		#lineWidthRaw,
	][0]
	if #lineWidth != null {
		visual: lineWidth: [
			if #lineWidth > 3 { 3 },        // line width can't go beyond 3 in Perses
			if #lineWidth < 0.25 { 0.25 },  // line width can't go below 0.25 in Perses
			#lineWidth,
		][0]
	}

	#lineStyle: *#panel.fieldConfig.defaults.custom.lineStyle.fill | null
	if #lineStyle != null {
		visual: lineStyle: #lineStyleMapping[#lineStyle]
	}

	#fillOpacity: *#panel.fieldConfig.defaults.custom.fillOpacity | null
	if #fillOpacity != null {
		visual: areaOpacity: #fillOpacity / 100
	}

	// NB: pointRadius skipped because the optimal size is automatically computed by Perses
	#spanNulls: *(#panel.fieldConfig.defaults.custom.spanNulls & bool) | null // skip in case of "threshold" mode because we don't support it
	if #spanNulls != null {
		visual: connectNulls: #spanNulls
	}

	#drawStyle: *#panel.fieldConfig.defaults.custom.drawStyle | null
	if #drawStyle != null {
		visual: display: [// switch
			if #drawStyle == "bars" {"bar"},
			"line",
		][0]
	}

	#stacking: *#panel.fieldConfig.defaults.custom.stacking.mode | "none"
	if #stacking != "none" {
		visual: stack: "all"
	}

	// migrate fixedColor overrides to querySettings when applicable
	#querySettings: [
		for i, target in (*#panel.targets | []) {
			queryIndex: i
			for override in (*#panel.fieldConfig.overrides | [])
			if (override.matcher.id == "byName" || override.matcher.id == "byRegexp") && override.matcher.options != _|_
			for property in override.properties
			if target.legendFormat == override.matcher.options || target.legendFormat =~ strings.Trim(override.matcher.options, "/") {
				if property.id == "color" if (*property.value.fixedColor | null) != null {
					colorMode: "fixed"
					colorValue: property.value.fixedColor
				}
				if property.id == "custom.lineStyle" if (*property.value.fill | null) != null {
					lineStyle: #lineStyleMapping[property.value.fill]
				}
				if property.id == "custom.fillOpacity" {
					areaOpacity: property.value / 100
				}
			}
		}
	]
	// don't keep elements that just define the queryIndex
	#querySettingsFiltered: [for qs in #querySettings if len(qs) > 1 { qs }]
	if len(#querySettingsFiltered) != 0 {
		querySettings: #querySettingsFiltered
	}
}
