package model

import (
	"strings"
)

kind: "JsonQuery"
spec: close({
	datasource?: {
		kind: "JsonDatasource"
	}
	endpointUrl:        strings.MinRunes(1)
	method?:            "GET" | "POST"
	queryParams?: {
		[string]: string
	}
	body?:              string
	jsonataExpression?: string
})
