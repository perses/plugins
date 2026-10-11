// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Regression test: Perses merges the schemas of all panel plugins into a single disjunction
// to build the dashboard schema. The TimeSeriesChart schema must remain valid in that context.
package dashboard

import (
	timeseries "github.com/perses/plugins/timeserieschart/schemas:model"
)

#Plugin: timeseries | {
	kind: "OtherPanel"
	spec: {}
}

#Dashboard: {
	panels: [string]: plugin: #Plugin
}
