package model

import (
	"strings"
	ds "github.com/perses/plugins/victorialogs/schemas/datasources:model"
)

kind: "VictoriaLogsTimeSeriesQuery"
spec: close({
	ds.#selector
	query: strings.MinRunes(1)
})
