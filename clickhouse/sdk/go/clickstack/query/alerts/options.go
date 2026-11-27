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

package alerts

import (
	"fmt"

	clickstackDatasource "github.com/perses/plugins/clickhouse/sdk/go/clickstack/datasource"
)

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		sel, err := clickstackDatasource.Selector(datasourceName)
		if err != nil {
			return err
		}
		builder.Datasource = sel
		return nil
	}
}

// States lists the alerts in one of the states. By default, the firing and pending alerts are listed.
func States(states ...State) Option {
	return func(builder *Builder) error {
		for _, state := range states {
			switch state {
			case StateAlert, StatePending, StateOK, StateInsufficientData, StateDisabled:
			default:
				return fmt.Errorf("invalid alert state %q", state)
			}
		}
		builder.States = states
		return nil
	}
}

// Sources lists the alerts watching one of the kinds of sources. By default, all the alerts are listed.
func Sources(sources ...Source) Option {
	return func(builder *Builder) error {
		for _, source := range sources {
			switch source {
			case SourceSavedSearch, SourceTile, SourceInline:
			default:
				return fmt.Errorf("invalid alert source %q", source)
			}
		}
		builder.Sources = sources
		return nil
	}
}

// Tags lists the alerts with one of the tags. Variables are supported, e.g. "team:$team".
func Tags(tags ...string) Option {
	return func(builder *Builder) error {
		builder.Tags = tags
		return nil
	}
}

// Search lists the alerts whose name contains the text. Variables are supported.
func Search(search string) Option {
	return func(builder *Builder) error {
		builder.Search = search
		return nil
	}
}
