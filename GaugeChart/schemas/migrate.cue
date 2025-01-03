if #panel.type != _|_ if #panel.type == "gauge" {
	kind: "GaugeChart"
	spec: {
		#calcName: *"\(#panel.options.reduceOptions.calcs[0])" | null // only consider [0] here as Perses's GaugeChart doesn't support individual calcs
		calculation: [// switch
			if #mapping.calc[#calcName] != _|_ {#mapping.calc[#calcName]},
			#defaultCalc,
		][0]

		#unitPath: *"\(#panel.fieldConfig.defaults.unit)" | null
		if #unitPath != null if #mapping.unit[#unitPath] != _|_ {
			format: {
				unit: #mapping.unit[#unitPath]
			}
		}
		#decimal: *(#panel.fieldConfig.defaults.decimal) | null
		if #decimal != null {
			format: {
				decimalPlaces: #decimal
			}
		}

		if #panel.fieldConfig.defaults.thresholds != _|_ if #panel.fieldConfig.defaults.thresholds.steps != _|_ {
			thresholds: {
				// defaultColor: TODO how to fill this one?
				steps: [for _, step in #panel.fieldConfig.defaults.thresholds.steps if step.value != _|_ {
					value: [// switch
						if step.value == null {0},
						step.value,
					][0]
					color: step.color
				}]
			}
		}
		if #panel.fieldConfig.defaults.max != _|_ {
			max: #panel.fieldConfig.defaults.max
		}
	}
},
