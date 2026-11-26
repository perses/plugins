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

package model

import (
	ds "github.com/perses/plugins/clickhouse/schemas/datasources/click-stack-datasource:model"
)

kind: "ClickStackAlertsQuery"
spec: close({
	ds.#selector

	// Only the alerts in one of these states. Defaults to the firing ("ALERT") and pending ones.
	states?: [...("ALERT" | "PENDING" | "OK" | "INSUFFICIENT_DATA" | "DISABLED")]
	// Only the alerts watching one of these kinds of sources. Defaults to all of them.
	sources?: [...("saved_search" | "tile" | "inline")]
	// Only the alerts with one of these tags.
	tags?: [...string]
	// Only the alerts whose name contains this text.
	search?: string
})
