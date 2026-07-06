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
	amDatasource "github.com/perses/plugins/alertmanager/sdk/go/datasource"
)

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = amDatasource.Selector(datasourceName)
		return nil
	}
}

func Filters(filters ...string) Option {
	return func(builder *Builder) error {
		builder.Filters = filters
		return nil
	}
}

func Active(active bool) Option {
	return func(builder *Builder) error {
		builder.Active = &active
		return nil
	}
}

func Silenced(silenced bool) Option {
	return func(builder *Builder) error {
		builder.Silenced = &silenced
		return nil
	}
}

func Inhibited(inhibited bool) Option {
	return func(builder *Builder) error {
		builder.Inhibited = &inhibited
		return nil
	}
}

func Unprocessed(unprocessed bool) Option {
	return func(builder *Builder) error {
		builder.Unprocessed = &unprocessed
		return nil
	}
}

func Receiver(receiver string) Option {
	return func(builder *Builder) error {
		builder.Receiver = receiver
		return nil
	}
}
