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

package log

import (
	"encoding/json"
	"testing"
)

func TestOpenSearchLogQueryBuilder(t *testing.T) {
	q := OpenSearchLogQuery(
		"source=logs-* | where traceId='$traceId'",
		Datasource("my-os"),
		Index("logs-*"),
		TimestampField("time"),
		MessageField("body"),
	)
	if q.Error != nil {
		t.Fatalf("unexpected error: %v", q.Error)
	}
	if q.Plugin.Kind != "OpenSearchLogQuery" {
		t.Fatalf("unexpected kind: %s", q.Plugin.Kind)
	}

	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if out["query"] != "source=logs-* | where traceId='$traceId'" {
		t.Errorf("query mismatch: %v", out["query"])
	}
	if out["index"] != "logs-*" {
		t.Errorf("index mismatch: %v", out["index"])
	}
	if out["timestampField"] != "time" {
		t.Errorf("timestampField mismatch: %v", out["timestampField"])
	}
	if out["messageField"] != "body" {
		t.Errorf("messageField mismatch: %v", out["messageField"])
	}
}

func TestOpenSearchLogQueryOmitsEmptyOptionalFields(t *testing.T) {
	q := OpenSearchLogQuery("source=logs-*")
	raw, _ := json.Marshal(q.Plugin.Spec)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)

	for _, f := range []string{"index", "timestampField", "messageField", "datasource"} {
		if _, present := out[f]; present {
			t.Errorf("expected %s to be omitted, got: %v", f, out[f])
		}
	}
}
