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
	"list"
	"strings"
	commonMigrate "github.com/perses/perses/cue/common/migrate"
)

#grafanaType: "stat"
#panel:       _

#mapping: {
    type: string
    options: [...{
        key: string
        value: string
        text: string
        color: string
    }]
}

kind: "StatChart"
spec: {
	calculation: *commonMigrate.#mapping.calc[#panel.options.reduceOptions.calcs[0]] | commonMigrate.#defaultCalc // only consider [0] here as Perses's GaugeChart doesn't support individual calcs

	// metricLabel
	#textMode: *#panel.options.textMode | null
    if #textMode == "name" && (*#panel.targets[0].legendFormat | null) != null {
		// /!\ best effort logic
		// - if legendFormat contains a more complex expression than {{label}}, the result will be broken (but manually fixable afterwards still)
		// - Perses's metricLabel is a single setting at panel level, hence the [0], so the result wont fit in case of multiple queries using different legendFormat
        metricLabel: strings.Trim(#panel.targets[0].legendFormat, "{}")
    }
	// /!\ here too using [0] thus not perfect, even though the field getting remapped is unique to the whole panel in that case
	if #textMode == "auto" && (*#panel.targets[0].format | null) == "table" && (*#panel.options.reduceOptions.fields | null) != null {
		metricLabel: strings.Trim(#panel.options.reduceOptions.fields, "/^$")
	}

	// format
	#unit: *commonMigrate.#mapping.unit[#panel.fieldConfig.defaults.unit] | null
	if #unit != null {
		format: unit: #unit
	}
	#decimal: *#panel.fieldConfig.defaults.decimal | *#panel.fieldConfig.defaults.decimals | null
	if #decimal != null {
		format: {
			decimalPlaces: #decimal
			if #unit == null {
				unit: "decimal"
			}
		}
	}

	// valueFontSize
	#fontsize: *#panel.options.text.valueSize | null
	if #fontsize != null {
		valueFontSize: #fontsize
	}

	// thresholds
	#steps: *#panel.fieldConfig.defaults.thresholds.steps | null
	if #steps != null {
		thresholds: {
			// defaultColor: TODO how to fill this one?
			steps: [for _, step in #steps if step.value != _|_ {
				value: [// switch
					if step.value == null {0},
					{step.value},
				][0]
				color: *commonMigrate.#mapping.color[step.color] | step.color // TODO how to manage the overrides part?
			}]
		}
	}

	// sparkline
	#sparkline: *#panel.options.graphMode | "none"
	if #sparkline == "area" {
		sparkline: {}
	}

	// mappings
	#mappings: list.Concat([
		// Using flatten to get rid of the nested array for "value" mappings
		// (https://cuelang.org/docs/howto/use-list-flattenn-to-flatten-lists/)
		list.FlattenN([
			for mapping in (*#panel.fieldConfig.defaults.mappings | []) {
				if mapping.type == "value" {
					[for key, option in mapping.options {
						{
							kind: "Value"
							spec: {
								value: key
								result: {
									if option.text != _|_ {
										value: option.text
									}
									if option.color != _|_ {
										color: *commonMigrate.#mapping.color[option.color] | option.color
									}
								}
							}
						}

					}]
				}
				if mapping.type != "value" { // else
					#result: {
						value: *mapping.options.result.text | ""
						if mapping.options.result.color != _|_ {
							color: *commonMigrate.#mapping.color[mapping.options.result.color] | mapping.options.result.color
						}
					}
					[//switch
						if mapping.type == "range" {
							kind: "Range"
							spec: {
								if mapping.options.from != _|_ {
									from: mapping.options.from
								}
								if mapping.options.to != _|_ {
									to: mapping.options.to
								}
								result: #result
							}
						},
						if mapping.type == "regex" {
							kind: "Regex"
							spec: {
								pattern: mapping.options.pattern
								result:  #result
							}
						},
						if mapping.type == "special" {
							kind: "Misc"
							spec: {
								value: [//switch
									if mapping.options.match == "nan" {"NaN"},
									if mapping.options.match == "null+nan" {"null"},
									mapping.options.match,
								][0]
								result: #result
							}
						},
					][0]
				}
			}
		], 1),
		for override in (*#panel.fieldConfig.overrides | [])
		if override.matcher.id == "byName" && override.matcher.options == "Value"
		for property in override.properties
		if property.id == "mappings" {
			list.FlattenN([
				for v in property.value {
					if v.type == "value" {
						[for oK, oV in v.options {
							kind: "Value"
							spec: {
								result: value: oV.text
								value: oK
							}
						}]
					}
					if v.type == "range" {
						kind: "Range"
						spec: {
							result: value: v.options.result.text
							from: v.options.from
							to: v.options.to
						}
					}
				}
			], 1),
		}
	])
	if len(#mappings) > 0 {
		mappings: #mappings
	}
}
