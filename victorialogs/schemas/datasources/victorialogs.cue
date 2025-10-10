package model

import (
	"github.com/perses/perses/cue/common"
	commonProxy "github.com/perses/perses/cue/common/proxy"
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
