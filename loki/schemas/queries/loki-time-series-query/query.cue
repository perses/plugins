package model

import (
	"strings"
)

kind: "LokiTimeSeriesQuery"
spec: close({
	datasource?: {
		kind: "LokiDatasource"
	}
	query: strings.MinRunes(1)
})
