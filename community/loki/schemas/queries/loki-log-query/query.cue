package model

import (
	"strings"
)

kind: "LokiLogQuery"
spec: close({
	datasource?: {
		kind: "LokiDatasource"
	}
	direction?: "forward" | "backward"
	query: strings.MinRunes(1)
})
