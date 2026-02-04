package model

import (
	"github.com/perses/perses/cue/common"
	commonProxy "github.com/perses/perses/cue/common/proxy"
)

kind: "OpenGeminiDatasource"
spec: commonProxy.#baseHTTPDatasourceSpec

#selector: common.#datasourceSelector & {
	kind: "OpenGeminiDatasource"
}
