package model

import (
	"strings"
)

kind: "SplunkLogQuery"
spec: close({
	datasource?: {
		kind: "SplunkDatasource"
	}
	query: strings.MinRunes(1)
	earliest_time?: string
	latest_time?: string
})
