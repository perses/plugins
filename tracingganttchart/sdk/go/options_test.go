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

package tracingganttchart

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/perses/perses/go-sdk/panel"
)

func marshal(t *testing.T, value any) string {
	t.Helper()
	bytes, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	return string(bytes)
}

func TestChartWithoutOptions(t *testing.T) {
	builder, err := panel.New("Trace", Chart())
	if err != nil {
		t.Fatalf("panel creation failed: %v", err)
	}

	if builder.Spec.Plugin.Kind != PluginKind {
		t.Errorf("unexpected plugin kind: %s", builder.Spec.Plugin.Kind)
	}
	if spec := marshal(t, builder.Spec.Plugin.Spec); spec != `{}` {
		t.Errorf("unexpected plugin spec: %s", spec)
	}
}

func TestChartWithSelectionAndActions(t *testing.T) {
	showLogs := EventAction("Show logs", "perses:span-logs")
	showLogs.Icon = "link"
	showLogs.BodyTemplate = `{"spanId": "${__data.fields["span.spanId"]}"}`

	report := WebhookAction("Report span", `https://example.com/spans/${__data.fields["span.spanId"]}`)
	report.ContentType = JSONContentType
	report.BatchMode = BatchBatchMode
	report.Headers = map[string]string{"X-Source": "perses"}

	builder, err := panel.New("Trace", Chart(
		WithSelection(true),
		WithActions(Actions{
			Enabled:         true,
			DisplayInHeader: true,
			DisplayWithItem: true,
			ActionsList:     []ItemAction{showLogs, report},
		}),
	))
	if err != nil {
		t.Fatalf("panel creation failed: %v", err)
	}

	expected := `{"selection":{"enabled":true},"actions":{"enabled":true,"displayInHeader":true,"displayWithItem":true,"actionsList":[` +
		`{"type":"event","name":"Show logs","enabled":true,"icon":"link","bodyTemplate":"{\"spanId\": \"${__data.fields[\"span.spanId\"]}\"}","eventName":"perses:span-logs"},` +
		`{"type":"webhook","name":"Report span","enabled":true,"batchMode":"batch","url":"https://example.com/spans/${__data.fields[\"span.spanId\"]}","method":"POST","contentType":"json","headers":{"X-Source":"perses"}}` +
		`]}}`
	if spec := marshal(t, builder.Spec.Plugin.Spec); spec != expected {
		t.Errorf("unexpected plugin spec:\n got: %s\nwant: %s", spec, expected)
	}
}

func TestWithActionsDefaultsWebhookMethodToPost(t *testing.T) {
	actionsList := []ItemAction{{Type: WebhookActionType, Name: "Report span", Enabled: true, URL: "https://example.com"}}

	builder, err := create(WithActions(Actions{Enabled: true, ActionsList: actionsList}))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	if method := builder.Actions.ActionsList[0].Method; method != PostMethod {
		t.Errorf("expected method %q, got %q", PostMethod, method)
	}
	if actionsList[0].Method != "" {
		t.Errorf("expected the actions of the caller to be unchanged, got method %q", actionsList[0].Method)
	}
}

func TestWithActionsSerializesAnEmptyActionsList(t *testing.T) {
	builder, err := create(WithActions(Actions{Enabled: true}))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	if actions := marshal(t, builder.Actions); actions != `{"enabled":true,"actionsList":[]}` {
		t.Errorf("unexpected actions: %s", actions)
	}
}

func TestWithActionsValidatesActions(t *testing.T) {
	tests := []struct {
		name   string
		action ItemAction
		err    string
	}{
		{name: "missing name", action: EventAction("", "perses:span-logs"), err: "name is required"},
		{name: "missing event name", action: EventAction("Show logs", ""), err: "eventName is required"},
		{name: "missing url", action: WebhookAction("Report span", ""), err: "url is required"},
		{name: "unknown type", action: ItemAction{Type: "link", Name: "Open"}, err: `unknown type "link"`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := create(WithActions(Actions{Enabled: true, ActionsList: []ItemAction{test.action}}))
			if err == nil || !strings.Contains(err.Error(), test.err) {
				t.Errorf("expected error containing %q, got %v", test.err, err)
			}
		})
	}
}
