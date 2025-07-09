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

#durationRegex: "^(\\d+y)?(\\d+w)?(\\d+d)?(\\d+h)?(\\d+m)?(\\d+s)?(\\d+ms)?$"