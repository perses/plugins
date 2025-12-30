package model

import (
	"strings"
)

kind: "ClickHouseLogQuery"
spec: close({
	datasource?: {
		kind: "ClickHouseDatasource"
	}
	query:             strings.MinRunes(1)
})
