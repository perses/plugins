package model

import (
	"github.com/perses/shared/cue/common"
	commonProxy "github.com/perses/shared/cue/common/proxy"
)

kind: "ClickHouseDatasource"
spec: {
	#directUrl | #proxy
}

#directUrl: {
	directUrl: common.#url
}

#proxy: {
	proxy: commonProxy.#HTTPProxy
}
