package model

import (
	"strings"
	ds "github.com/perses/plugins/opengemini/schemas/datasources/opengemini-datasource:model"
)

kind: "OpenGeminiTimeSeriesQuery"
spec: close({
	datasource?: ds.#selector
	// InfluxQL query string
	query: strings.MinRunes(1)
	// Database name to query
	database: strings.MinRunes(1)
})
