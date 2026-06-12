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

package panel

func DefaultGroupBy(labels ...string) Option {
	return func(builder *Builder) error {
		builder.DefaultGroupBy = labels
		return nil
	}
}

func Columns(columns ...ColumnDefinition) Option {
	return func(builder *Builder) error {
		builder.Columns = columns
		return nil
	}
}

func Deduplication(config DeduplicationConfig) Option {
	return func(builder *Builder) error {
		builder.Deduplication = &config
		return nil
	}
}

func AllowedActions(actions ...AlertAction) Option {
	return func(builder *Builder) error {
		builder.AllowedActions = actions
		return nil
	}
}

func RunbookAnnotationKey(key string) Option {
	return func(builder *Builder) error {
		builder.RunbookAnnotationKey = key
		return nil
	}
}

func LabelColorMappings(mappings ...LabelColorMapping) Option {
	return func(builder *Builder) error {
		builder.LabelColorMappings = mappings
		return nil
	}
}
