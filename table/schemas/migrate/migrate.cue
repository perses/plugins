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

package migrate

import (
	"list"
	"strconv"
	"struct"

	commonMigrate "github.com/perses/shared/cue/common/migrate"
)

#grafanaType: "table" | "table-old"
#panel:       _

// Build "Value #X" → "value #N" mapping from the targets array.
// In Grafana, multi-query table panels name value columns by refId (e.g. "Value #A", "Value #B").
// In Perses, the equivalent columns are named by 1-based query index (e.g. "value #1", "value #2").
_valueColumnRenameMap: {
	for i, target in (*#panel.targets | []) if target.refId != _|_ {
		"Value #\(target.refId)": "value #\(i+1)"
	}
}

// Function to rename anonymous fields that Perses names differently than Grafana
_renameAnonymousFields: {
	#var: string
	output: [
		if #var == "Time" {"timestamp"},
		if #var == "Value" {"value"},
		if (*_valueColumnRenameMap[#var] | null) != null {_valueColumnRenameMap[#var]},
		#var,
	][0]
}

// Function to return the last key of a map
_getLastKey: {
	#map: struct.MinFields(1)
	output: [for k, _ in #map {k}][len(#map)-1]
}

// Function to return the last value of a map
_getLastValue: {
	#map: struct.MinFields(1)
	output: [for _, v in #map {v}][len(#map)-1]
}

kind: "Table"
spec: {
	if (*#panel.type | null) == "table" {
		#cellHeight: *#panel.options.cellHeight | null
		if #cellHeight != null {
			density: [
				if #cellHeight == "sm" {"compact"},
				if #cellHeight == "lg" {"comfortable"},
				"standard",
			][0]
		}

		// Retrieve the settings defined in transformations
		// We collect possible values first, then resolve to the last one to mimic Grafana precedence.
		_columnSettingsFromTransformRaw: {
			for transformation in (*#panel.transformations | []) if transformation.id == "organize" {
				for columnName, columnIndex in (*transformation.options.indexByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": indexes: "\(columnIndex)": true
				}
				for columnName, hidden in (*transformation.options.excludeByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": hides: "\(hidden)": true
				}
				for columnName, displayName in (*transformation.options.renameByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": headers: "\(displayName)": true
				}
			}
		}
		_columnSettingsFromTransform: {
			for name, settings in _columnSettingsFromTransformRaw {
				"\(name)": {
					if settings.indexes != _|_ if len(settings.indexes) > 0 {
						_index: {_getLastKey & {#map: settings.indexes}}.output
						index: strconv.Atoi(_index)
					}
					if settings.hides != _|_ if len(settings.hides) > 0 {
						_hide: {_getLastKey & {#map: settings.hides}}.output
						hide: _hide == "true"
					}
					if settings.headers != _|_ if len(settings.headers) > 0 {
						header: {_getLastKey & {#map: settings.headers}}.output
					}
				}
			}
		}

		// Function to rename a field if it was renamed by a transformation
		_reuseMatchingName: this={
			#var: string
			output: [
				// Check if the column was renamed by a transform
				for k, v in _columnSettingsFromTransform if #var == (*v.header | null) {k},
				{_renameAnonymousFields & {#var: this.#var}}.output,
			][0]
		}

		// Retrieve the settings defined in field overrides
		_columnSettingsFromOverrides: {
			for override in (*#panel.fieldConfig.overrides | []) if override.matcher.id == "byName" && override.matcher.options != _|_ {
				for property in override.properties {
					if property.id == "displayName" {
						// Several header overrides could be defined for the same column name, thus we use yet another intermediary map to gather the "possibilites" in a list
						"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": headers: "\(property.value)": true // dummy value, we care only about the key
					}
					if property.id == "custom.width" {
						// Same principle for width
						"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": widths: (*"\(property.value)" | "auto"): true
					}
					if property.id == "links" {
						for link in property.value {
							"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": dataLinks: "\(link.url)": {
								url:        link.url
								openNewTab: *link.targetBlank | false
								if link.title != _|_ {
									title: link.title
								}
							}
						}
					}
					if property.id == "unit" {
						"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": units: "\(property.value)": true
					}
					if property.id == "noValue" {
						"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": noValues: "\(property.value)": true
					}
					if property.id == "mappings" {
						for mapping in property.value if mapping.type == "value" {
							for key, option in mapping.options {
								"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": valueMappings: "\(key)": option
							}
						}
					}
					if property.id == "custom.cellOptions" if property.value.type != _|_ {
						"\({_reuseMatchingName & {#var: override.matcher.options}}.output)": cellStyles: "\(property.value.type)": true
					}
					// NB: enrich this part when this is done https://github.com/perses/perses/issues/2852
				}
			}
		}

		// Absolute thresholds ladder (shared by global + per-column cellSettings).
		_thresholdColorMode: *#panel.fieldConfig.defaults.color.mode | "palette-classic"
		_thresholdMode:      *#panel.fieldConfig.defaults.thresholds.mode | "absolute"
		_defaultCellType:    *#panel.fieldConfig.defaults.custom.cellOptions.type | "auto"
		_thresholdNumericSteps: [
			for step in (*#panel.fieldConfig.defaults.thresholds.steps | [])
			if step.value != null && step.value != _|_ && step.color != _|_ {
				min:   step.value
				color: step.color
			},
		]
		_thresholdBaseColors: [
			for step in (*#panel.fieldConfig.defaults.thresholds.steps | [])
			if (step.value == null || step.value == _|_) && step.color != _|_ {
				color: step.color
			},
		]
		_thresholdEnabled: _thresholdColorMode == "thresholds" && _thresholdMode == "absolute" && len(_thresholdNumericSteps) > 0
		// #useText true → textColor; false → backgroundColor.
		// Highest min first; base covers values below the lowest numeric step (incl. negatives).
		// Range schema requires max>=min when both set — use min floor + max: lowest.
		_thresholdLadder: {
			#useText: bool
			cells: list.Concat([
				list.Reverse([
					for s in _thresholdNumericSteps {
						condition: {
							kind: "Range"
							spec: min: s.min
						}
						_hex: *commonMigrate.#mapping.color[s.color] | s.color
						if #useText {
							textColor: _hex
						}
						if !#useText {
							backgroundColor: _hex
						}
					},
				]),
				[for b in _thresholdBaseColors if len(_thresholdNumericSteps) > 0 {
					condition: {
						kind: "Range"
						spec: {
							min: -1e15
							max: list.Min([for s in _thresholdNumericSteps {s.min}])
						}
					}
					_hex: *commonMigrate.#mapping.color[b.color] | b.color
					if #useText {
						textColor: _hex
					}
					if !#useText {
						backgroundColor: _hex
					}
				}],
			])
		}

		// Build a last intermediary object merging both sources of settings
		_columnSettingsMerged: {
			for name, settings in _columnSettingsFromOverrides {
				"\(name)": {
					// In Grafana if there are multiple overrides for the same field, the last one takes precedence
					if settings.headers != _|_ if len(settings.headers) > 0 {
						header: {_getLastKey & {#map: settings.headers}}.output
					}
					if settings.widths != _|_ if len(settings.widths) > 0 {
						_width: {_getLastKey & {#map: settings.widths}}.output
						width: [
							if _width == "auto" {"auto"},
							strconv.Atoi(_width),
						][0]
					}
					if settings.dataLinks != _|_ {
						dataLink: {_getLastValue & {#map: settings.dataLinks}}.output
					}

					// Unit override → format (only emit if unit is recognized by Perses)
					if settings.units != _|_ if len(settings.units) > 0 {
						_unitStr: {_getLastKey & {#map: settings.units}}.output
						_resolvedUnit: *commonMigrate.#mapping.unit[_unitStr] | null
						if _resolvedUnit != null {
							format: unit: _resolvedUnit
						}
					}

					// noValue + valueMappings → cellSettings
					_noValueEntries: [
						if settings.noValues != _|_ if len(settings.noValues) > 0 {{
							condition: {
								kind: "Misc"
								spec: value: "null"
							}
							text: {_getLastKey & {#map: settings.noValues}}.output
						}},
					]
					_mappingEntries: [
						for key, option in (*settings.valueMappings | {}) {{
							condition: {
								kind: "Value"
								spec: value: key
							}
							if option.text != _|_ {
								text: option.text
							}
							if option.color != _|_ {
								backgroundColor: *commonMigrate.#mapping.color[option.color] | option.color
							}
						}},
					]
					// Field-scoped cell style keeps thresholds on this column only.
					_columnThresholdEntries: [
						if _thresholdEnabled && settings.cellStyles != _|_ if len(settings.cellStyles) > 0
						if {_getLastKey & {#map: settings.cellStyles}}.output == "color-text"
						for c in (_thresholdLadder & {#useText: true}).cells {c},
						if _thresholdEnabled && settings.cellStyles != _|_ if len(settings.cellStyles) > 0
						if {_getLastKey & {#map: settings.cellStyles}}.output == "color-background"
						for c in (_thresholdLadder & {#useText: false}).cells {c},
					]
					_columnCellSettings: list.Concat([_noValueEntries, _mappingEntries, _columnThresholdEntries])
					if len(_columnCellSettings) > 0 {
						cellSettings: _columnCellSettings
					}
				}
			}
			for name, settings in _columnSettingsFromTransform {
				"\(name)": [
					// We have to hande potential name conflicts due to the overrides.
					// In Grafana field overrides take precedence over the organize transformations.
					if (*_columnSettingsFromOverrides[name].headers | null) != null {
						// Copy all fields except header
						for fieldName, fieldValue in settings if fieldName != "header" {
							"\(fieldName)": fieldValue
						}
					},
					settings,
				][0]
			}
		}

		// Building the columnSettings is a bit tricky because:
		// - column order in Perses is based on the order of items in the array (and not on a index field like Grafana)
		// - not all elements from our intermediary object _columnSettingsMerged have an index defined
		// Thus we append first the items that could be reordered, and append the remaining ones in bulk after
		columnSettings: list.Concat([
			[for desiredIndex, _ in [for k in _columnSettingsMerged {}] for columnName, settings in _columnSettingsMerged if settings.index != _|_ if desiredIndex == settings.index {
				name: columnName
				// Copy all fields except index
				for fieldName, fieldValue in settings if fieldName != "index" {
					"\(fieldName)": fieldValue
				}
			}],
			[for columnName, settings in _columnSettingsMerged if settings.index == _|_ {
				name: columnName
				settings
			}],
		])

		// Using flatten to get rid of the nested array for "value" mappings
		// (https://cuelang.org/docs/howto/use-list-flattenn-to-flatten-lists/)
		#cellSettingsFromMappings: list.FlattenN([
			for mapping in (*#panel.fieldConfig.defaults.mappings | []) {
				if mapping.type == "value" {
					[for key, option in mapping.options {
						condition: {
							kind: "Value"
							spec: {
								value: key
							}
						}
						if option.text != _|_ {
							text: option.text
						}
						if option.color != _|_ {
							backgroundColor: *commonMigrate.#mapping.color[option.color] | option.color
						}
					}]
				}
				if mapping.type != "value" {
					condition: [//switch
						if mapping.type == "range" {
							kind: "Range"
							spec: {
								if mapping.options.from != _|_ {
									min: mapping.options.from
								}
								if mapping.options.to != _|_ {
									max: mapping.options.to
								}
							}
						},
						if mapping.type == "regex" {
							kind: "Regex"
							spec: {
								expr: mapping.options.pattern
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
							}
						},
					][0]
					if mapping.options.result.text != _|_ {
						text: mapping.options.result.text
					}

					if mapping.options.result.color != _|_ {
						backgroundColor: *commonMigrate.#mapping.color[mapping.options.result.color] | mapping.options.result.color
					} // else
				}
			},
		], 1)

		// Global thresholds only when the default cell style is color-text / color-background.
		// Field overrides attach their own ladder on columnSettings[].cellSettings above.
		_globalThresholdEntries: [
			if _thresholdEnabled && _defaultCellType == "color-text"
			for c in (_thresholdLadder & {#useText: true}).cells {c},
			if _thresholdEnabled && _defaultCellType == "color-background"
			for c in (_thresholdLadder & {#useText: false}).cells {c},
		]
		#cellSettings: list.Concat([#cellSettingsFromMappings, _globalThresholdEntries])
		if len(#cellSettings) != 0 {
			cellSettings: #cellSettings
		}

		// Logic to build transforms:
		if #panel.transformations != _|_ {
			#transforms: [
				for transformation in #panel.transformations if transformation.id == "merge" || transformation.id == "joinByField" {
					if transformation.id == "merge" {
						kind: "MergeSeries"
						spec: {
							if transformation.disabled != _|_ {
								disabled: transformation.disabled
							}
						}
					}
					if transformation.id == "joinByField" {
						kind: "JoinByColumnValue"
						spec: {
							columns: *[transformation.options.byField] | []
							if transformation.disabled != _|_ {
								disabled: transformation.disabled
							}
						}
					}
				},
			]
			if len(#transforms) > 0 {
				transforms: #transforms
			}
		}
	}
	if (*#panel.type | null) == "table-old" {
		if #panel.styles != _|_ {
			columnSettings: [for style in #panel.styles {
				name: "\({_renameAnonymousFields & {#var: style.pattern}}.output)"
				if style.type == "hidden" {
					hide: true
				}
				if style.alias != _|_ {
					header: style.alias
				}
				#align: *style.align | "auto"
				if #align != "auto" {
					align: style.align
				}
			}]
		}
	}
}
