// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"strings"
	"github.com/perses/shared/cue/common"
)

kind: "AzureResourceGraphKqlVariable"
spec: close({
	common.#datasourceSelector & {_kind: "AzureResourceManagerDatasource"}
	kqlQuery: strings.MinRunes(1) | =~common.#variableSyntaxRegex
	subscriptions?: [...=~#uuidRegex | =~common.#variableSyntaxRegex]
	managementGroups?: [...strings.MinRunes(1) | =~common.#variableSyntaxRegex]
	labelColumnName?: strings.MinRunes(1)
	valueColumnName:  strings.MinRunes(1)
})

#uuidRegex: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
