package model

import (
	"github.com/perses/perses/cue/common"
	commonProxy "github.com/perses/perses/cue/common/proxy"
)

kind: "LokiDatasource"
spec: {
	#directUrl | #proxy
}

#directUrl: {
	directUrl: common.#url
}

#proxy: {
	proxy: commonProxy.#HTTPProxy
}