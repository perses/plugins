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

package query

import "github.com/perses/plugins/jaeger/sdk/go/datasource"

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = datasource.Selector(datasourceName)
		return nil
	}
}

func TraceID(traceID string) Option {
	return func(builder *Builder) error {
		builder.TraceID = traceID
		return nil
	}
}

func Service(service string) Option {
	return func(builder *Builder) error {
		builder.Service = service
		return nil
	}
}

func Operation(operation string) Option {
	return func(builder *Builder) error {
		builder.Operation = operation
		return nil
	}
}

func SpanKind(spanKind string) Option {
	return func(builder *Builder) error {
		builder.SpanKind = spanKind
		return nil
	}
}

func Tags(tags string) Option {
	return func(builder *Builder) error {
		builder.Tags = tags
		return nil
	}
}

func MinDuration(duration string) Option {
	return func(builder *Builder) error {
		builder.MinDuration = duration
		return nil
	}
}

func MaxDuration(duration string) Option {
	return func(builder *Builder) error {
		builder.MaxDuration = duration
		return nil
	}
}

func Limit(limit int) Option {
	return func(builder *Builder) error {
		builder.Limit = &limit
		return nil
	}
}
