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
	"strings"
	ds "github.com/perses/plugins/opensearch/schemas/datasources:model"
)

kind: "OpenSearchLogQuery"

// `index` is required only for the languages that put it in the request URL
// (`lucene`, `dsl`, which hit `_search`); it's optional for `ppl`/`sql`, where
// the index lives in the query text itself. `query` may be empty only for
// `lucene`, where a blank query string means "everything in the time range".
//
// A disjunction of two closed structs (one branch requiring `index` for
// lucene/dsl, one leaving it optional for ppl/sql) does NOT work: a missing
// *required* field in CUE produces an *incomplete* value, not a conflicting
// one, so the lucene/dsl branch is never eliminated just because
// `queryLanguage` is absent from the input. That leaves the whole disjunction
// unresolved, and every spec that omits `queryLanguage` (which must be legal —
// see tests/valid/no-language.json) fails as "incomplete value" instead of
// validating against the ppl/sql branch. Do not retry this approach.
//
// The `if` comprehension below works instead, but only because of two things
// together: `queryLanguage` is given a default (`*"ppl" | ...`) so it is
// always concrete, even when the input omits it entirely; and every field
// referenced by the comprehension is declared directly in this one struct
// literal. A CUE comprehension condition can only see fields declared
// lexically in the same struct literal — it cannot see fields that arrive via
// unification (`someBase & {...}`) or embedding a separately-declared struct
// (`{someBase, if ...}`). A prior version of this schema factored the shared
// fields out into a `_base` field and unified/embedded it here; that broke
// the comprehension, because `queryLanguage` (declared in `_base`) wasn't
// visible to the `if` conditions declared alongside the embedding. So all
// fields are inlined directly into this single `spec: close({...})` struct
// literal instead of being factored out — do not re-extract a shared base
// without re-testing the comprehension against it.
spec: close({
	ds.#selector
	timestampField?:    strings.MinRunes(1)
	messageField?:      strings.MinRunes(1)
	disableTimeFilter?: bool
	limit?:             int & >0
	queryLanguage:      *"ppl" | "sql" | "lucene" | "dsl"
	if queryLanguage == "lucene" {
		query: string
	}
	if queryLanguage != "lucene" {
		query: strings.MinRunes(1)
	}
	if queryLanguage == "lucene" || queryLanguage == "dsl" {
		index: strings.MinRunes(1)
	}
	if queryLanguage != "lucene" && queryLanguage != "dsl" {
		index?: strings.MinRunes(1)
	}
})
