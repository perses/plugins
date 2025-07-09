package model

import (
	"strings"
	"github.com/perses/perses/cue/common"
	lokiDs "github.com/perses/plugins/loki/schemas/datasources/loki-datasource:model"
)

kind: "LokiQuery"
spec: close({
	datasource?: {
		kind: "LokiDatasource"
	}
	query:             strings.MinRunes(1)
	minStep?:          =~lokiDs.#durationRegex | =~common.#variableSyntaxRegex
})
