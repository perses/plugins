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

// The types of this file mirror the #selection and #actions definitions of github.com/perses/shared/cue/common.

// Selection exposes the spans checked in the gantt chart as panel selection,
// used by the actions displayed in the panel header.
type Selection struct {
	Enabled bool `json:"enabled,omitempty" yaml:"enabled,omitempty"`
}

type ActionType string

const (
	EventActionType   ActionType = "event"
	WebhookActionType ActionType = "webhook"
)

type BatchMode string

const (
	// IndividualBatchMode executes the action once per span.
	IndividualBatchMode BatchMode = "individual"
	// BatchBatchMode executes the action once for all spans.
	BatchBatchMode BatchMode = "batch"
)

type HTTPMethod string

const (
	GetMethod    HTTPMethod = "GET"
	PostMethod   HTTPMethod = "POST"
	PutMethod    HTTPMethod = "PUT"
	PatchMethod  HTTPMethod = "PATCH"
	DeleteMethod HTTPMethod = "DELETE"
)

type ContentType string

const (
	NoneContentType ContentType = "none"
	JSONContentType ContentType = "json"
	TextContentType ContentType = "text"
)

// ItemAction is an event or a webhook action, executed with the data of spans.
// Use EventAction or WebhookAction to create an enabled action.
type ItemAction struct {
	Type ActionType `json:"type" yaml:"type"`
	Name string     `json:"name" yaml:"name"`
	// Enabled must be true for the action to be displayed.
	Enabled        bool      `json:"enabled" yaml:"enabled"`
	Icon           string    `json:"icon,omitempty" yaml:"icon,omitempty"`
	ConfirmMessage string    `json:"confirmMessage,omitempty" yaml:"confirmMessage,omitempty"`
	BodyTemplate   string    `json:"bodyTemplate,omitempty" yaml:"bodyTemplate,omitempty"`
	BatchMode      BatchMode `json:"batchMode,omitempty" yaml:"batchMode,omitempty"`
	// EventName is the name of the CustomEvent dispatched on window, required by event actions.
	EventName string `json:"eventName,omitempty" yaml:"eventName,omitempty"`
	// URL is the URL of the request, required by webhook actions.
	URL         string            `json:"url,omitempty" yaml:"url,omitempty"`
	Method      HTTPMethod        `json:"method,omitempty" yaml:"method,omitempty"`
	ContentType ContentType       `json:"contentType,omitempty" yaml:"contentType,omitempty"`
	Headers     map[string]string `json:"headers,omitempty" yaml:"headers,omitempty"`
}

// EventAction creates an enabled action dispatching a CustomEvent named eventName on window.
func EventAction(name string, eventName string) ItemAction {
	return ItemAction{
		Type:      EventActionType,
		Name:      name,
		Enabled:   true,
		EventName: eventName,
	}
}

// WebhookAction creates an enabled action sending a POST request to url.
func WebhookAction(name string, url string) ItemAction {
	return ItemAction{
		Type:    WebhookActionType,
		Name:    name,
		Enabled: true,
		URL:     url,
		Method:  PostMethod,
	}
}

// Actions configures the item actions, executed with the data of spans.
type Actions struct {
	// Enabled must be true for the actions to be displayed.
	Enabled bool `json:"enabled" yaml:"enabled"`
	// DisplayInHeader displays the actions in the panel header, executed with the checked spans (see Selection).
	DisplayInHeader bool `json:"displayInHeader,omitempty" yaml:"displayInHeader,omitempty"`
	// DisplayWithItem displays the actions in the detail pane, executed with the opened span.
	DisplayWithItem bool         `json:"displayWithItem,omitempty" yaml:"displayWithItem,omitempty"`
	ActionsList     []ItemAction `json:"actionsList" yaml:"actionsList"`
}
