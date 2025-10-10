package model

import (
	"strings"
	ds "github.com/perses/plugins/victorialogs/schemas/datasources:model"
)

kind: "VictoriaLogsLogQuery"
spec: close({
	ds.#selector
	query: strings.MinRunes(1)
})
