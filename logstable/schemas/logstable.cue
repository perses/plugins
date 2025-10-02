package model

import (
	"github.com/perses/perses/cue/common"
)

#legendValue: common.#calculation

#legend: {
	position: "bottom" | "right"
	mode?:    "list" | "table"
	size?:    "small" | "medium"
	values?: [...#legendValue]
}

kind: "LogsTable"
spec: close({
	legend?:        #legend
	thresholds?:    common.#thresholds
	wrap?:          bool
	enableDetails?: bool
	time?:          bool
})
