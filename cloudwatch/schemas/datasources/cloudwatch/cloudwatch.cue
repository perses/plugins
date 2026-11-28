// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"github.com/perses/shared/cue/common"
	"github.com/perses/spec/cue/datasource/proxy/http"
)

#kind: "CloudWatchDatasource"

kind: #kind

// The requests are sent through the HTTP proxy of the Perses server, which signs them with the SigV4 credentials
// of the secret. The browser never receives AWS credentials, so a direct URL is not supported.
spec: close({
	proxy: http.#Proxy & {
		spec: secret: string & !=""
	}
})

#selector: common.#datasourceSelector & {_kind: #kind}
