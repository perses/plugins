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
	"strings"
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

	for _, f := range []string{"index", "timestampField", "messageField", "datasource", "disableTimeFilter"} {
		if _, present := out[f]; present {
			t.Errorf("expected %s to be omitted, got: %v", f, out[f])
		}
	}
}

func TestPluginSpecRejectsEmptyQueryOnUnmarshal(t *testing.T) {
	raw := []byte(`{"query":""}`)
	var spec PluginSpec
	if err := json.Unmarshal(raw, &spec); err == nil {
		t.Fatalf("expected error unmarshalling spec with empty query, got nil")
	}
}

func TestPluginSpecAcceptsEmptyLuceneQueryOnUnmarshal(t *testing.T) {
	raw := []byte(`{"query":"","queryLanguage":"lucene","index":"logs-*"}`)
	var spec PluginSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPluginSpecRejectsEmptySQLQueryOnUnmarshal(t *testing.T) {
	raw := []byte(`{"query":"","queryLanguage":"sql"}`)
	var spec PluginSpec
	if err := json.Unmarshal(raw, &spec); err == nil {
		t.Fatalf("expected error unmarshalling sql spec with empty query, got nil")
	}
}

func TestPluginSpecAcceptsNonEmptyQueryOnUnmarshal(t *testing.T) {
	raw := []byte(`{"query":"source=logs-*"}`)
	var spec PluginSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spec.Query != "source=logs-*" {
		t.Errorf("query mismatch: %q", spec.Query)
	}
}

func TestOpenSearchLogQueryDisableTimeFilter(t *testing.T) {
	q := OpenSearchLogQuery("source=logs-*", DisableTimeFilter(true))
	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if out["disableTimeFilter"] != true {
		t.Errorf("disableTimeFilter mismatch: %v", out["disableTimeFilter"])
	}
}

func TestQueryLanguageAndLimit(t *testing.T) {
	q := OpenSearchLogQuery("level:error",
		QueryLanguage("lucene"),
		Index("logs-*"),
		Limit(250),
	)
	if q.Error != nil {
		t.Fatalf("unexpected error: %v", q.Error)
	}

	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if out["queryLanguage"] != "lucene" {
		t.Errorf("queryLanguage mismatch: %v", out["queryLanguage"])
	}
	// JSON numbers decode as float64 into map[string]any.
	if out["limit"] != float64(250) {
		t.Errorf("limit mismatch: %v", out["limit"])
	}
}

func TestDefaultLanguageIsOmitted(t *testing.T) {
	q := OpenSearchLogQuery("source=logs-*")
	if q.Error != nil {
		t.Fatalf("unexpected error: %v", q.Error)
	}

	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	// No queryLanguage or limit key at all: the plugin treats absence as PPL.
	if _, ok := out["queryLanguage"]; ok {
		t.Errorf("queryLanguage should be omitted, got %v", out["queryLanguage"])
	}
	if _, ok := out["limit"]; ok {
		t.Errorf("limit should be omitted, got %v", out["limit"])
	}
}

func TestRejectsUnknownLanguage(t *testing.T) {
	q := OpenSearchLogQuery("level:error", QueryLanguage("kql"), Index("logs-*"))
	if q.Error == nil {
		t.Fatal("expected an error for an unknown query language")
	}
	if !strings.Contains(q.Error.Error(), "unknown query language") {
		t.Errorf("unexpected error text: %v", q.Error)
	}
}

func TestRequiresIndexForLucene(t *testing.T) {
	var spec PluginSpec
	err := json.Unmarshal([]byte(`{"query":"level:error","queryLanguage":"lucene"}`), &spec)
	if err == nil {
		t.Fatal("expected an error when index is missing for lucene")
	}
	if !strings.Contains(err.Error(), "index is required") {
		t.Errorf("unexpected error text: %v", err)
	}
}

func TestLimitRejectsZero(t *testing.T) {
	q := OpenSearchLogQuery("level:error", QueryLanguage("lucene"), Index("logs-*"), Limit(0))
	if q.Error == nil {
		t.Fatal("expected an error for Limit(0)")
	}
	if !strings.Contains(q.Error.Error(), "limit must be greater than 0") {
		t.Errorf("unexpected error text: %v", q.Error)
	}
}

func TestLimitRejectsNegative(t *testing.T) {
	q := OpenSearchLogQuery("level:error", QueryLanguage("lucene"), Index("logs-*"), Limit(-3))
	if q.Error == nil {
		t.Fatal("expected an error for Limit(-3)")
	}
	if !strings.Contains(q.Error.Error(), "limit must be greater than 0") {
		t.Errorf("unexpected error text: %v", q.Error)
	}
}
