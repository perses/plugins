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
	"strconv"
	"struct"

	commonMigrate "github.com/perses/perses/cue/common/migrate"
)

#grafanaType: "table" | "table-old"
#panel: _

// Function to rename anonymous fields that Perses names differently than Grafana
_renameAnonymousFields: {
	#var: string
	output: [
		if #var == "Time" {"timestamp"},
		if #var == "Value" {"value"},
		#var,
	][0]
}

// Function to return the last key of a map
_getLastKey: {
    #map: struct.MinFields(1)
    output: [for k, _ in #map {k}][len(#map) - 1]
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
		_columnSettingsFromTansform: {
			for transformation in (*#panel.transformations | []) if transformation.id == "organize" {
				for columnName, columnIndex in (*transformation.options.indexByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": index: columnIndex
				}
				for columnName, hidden in (*transformation.options.excludeByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": hide: hidden
				}
				for columnName, displayName in (*transformation.options.renameByName | {}) {
					"\({_renameAnonymousFields & {#var: columnName}}.output)": header: displayName
				}
			}
		}

		// Function to rename a field if it was renamed by a transformation
		_reuseMatchingName: this={
			#var: string
			output: [
				// Check if the column was renamed by a transform
				for k, v in _columnSettingsFromTansform if #var == (*v.header | null) { k },
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
					// NB: enrich this part when this is done https://github.com/perses/perses/issues/2852
				}
			}
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
				}
			}
			for name, settings in _columnSettingsFromTansform {
				"\(name)": [
				  // We have to hande potential name conflicts due to the overrides.
				  // In Grafana field overrides take precedence over the organize transformations.
				  if (*_columnSettingsFromOverrides[name].headers | null) != null {
					  // Copy all fields except header
					  for fieldName, fieldValue in settings if fieldName != "header" {
						"\(fieldName)": fieldValue
					  }
				  },
				  settings
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
			}]
		])
		
		// Using flatten to get rid of the nested array for "value" mappings
		// (https://cuelang.org/docs/howto/use-list-flattenn-to-flatten-lists/)
		#cellSettings: list.FlattenN([
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
				if mapping.type != "value" { // else
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
					}
				}
			},
		], 1),
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
