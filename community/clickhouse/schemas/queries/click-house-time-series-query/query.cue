package model

import (
	"strings"
)

kind: "ClickHouseTimeSeriesQuery"
spec: close({
	datasource?: {
		kind: "ClickHouseDatasource"
	}
	query:             strings.MinRunes(1)
})
