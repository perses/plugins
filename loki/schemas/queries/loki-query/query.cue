package model

import (
	"strings"
)

kind: "LokiQuery"
spec: close({
	datasource?: {
		kind: "LokiDatasource"
	}
	query:             strings.MinRunes(1)
})
