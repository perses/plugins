package model

import (
	"strings"
)

kind: "LokiLogQuery"
spec: close({
	datasource?: {
		kind: "LokiDatasource"
	}
	query: strings.MinRunes(1)
})
