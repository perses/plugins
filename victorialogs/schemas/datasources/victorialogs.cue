package model

import (
	"github.com/perses/shared/cue/common"
	commonProxy "github.com/perses/shared/cue/common/proxy"
)

kind: #kind
spec: {
	#directUrl | #proxy
}

#kind: "VictoriaLogsDatasource"

#directUrl: {
	directUrl: common.#url
}

#proxy: {
	proxy: commonProxy.#HTTPProxy
}

#selector: common.#datasourceSelector & {
	datasource?: =~common.#variableSyntaxRegex | {
		kind: #kind
	}
}
