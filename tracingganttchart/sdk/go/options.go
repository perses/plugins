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

import "fmt"

// WithSelection enables the selection of spans with checkboxes.
func WithSelection(enabled bool) Option {
	return func(builder *Builder) error {
		builder.Selection = &Selection{Enabled: enabled}
		return nil
	}
}

// WithActions configures the item actions.
// Webhook actions without method use POST, the default method of the schema.
func WithActions(actions Actions) Option {
	return func(builder *Builder) error {
		actionsList := make([]ItemAction, 0, len(actions.ActionsList))
		for i, action := range actions.ActionsList {
			if err := validateAction(action); err != nil {
				return fmt.Errorf("invalid action at index %d: %w", i, err)
			}
			if action.Type == WebhookActionType && action.Method == "" {
				action.Method = PostMethod
			}
			actionsList = append(actionsList, action)
		}
		actions.ActionsList = actionsList
		builder.Actions = &actions
		return nil
	}
}

func validateAction(action ItemAction) error {
	if action.Name == "" {
		return fmt.Errorf("name is required")
	}
	switch action.Type {
	case EventActionType:
		if action.EventName == "" {
			return fmt.Errorf("eventName is required for event action %q", action.Name)
		}
	case WebhookActionType:
		if action.URL == "" {
			return fmt.Errorf("url is required for webhook action %q", action.Name)
		}
	default:
		return fmt.Errorf("unknown type %q for action %q, expected %q or %q", action.Type, action.Name, EventActionType, WebhookActionType)
	}
	return nil
}
