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

import (
	jsonDatasource "github.com/perses/plugins/json/sdk/go/datasource"
)

func Datasource(datasourceName string) Option {
	return func(builder *Builder) error {
		builder.Datasource = jsonDatasource.Selector(datasourceName)
		return nil
	}
}

func EndpointURL(url string) Option {
	return func(builder *Builder) error {
		builder.EndpointURL = url
		return nil
	}
}

func GET() Option {
	return func(builder *Builder) error {
		builder.Method = "GET"
		return nil
	}
}

func POST(body string) Option {
	return func(builder *Builder) error {
		builder.Method = "POST"
		builder.Body = body
		return nil
	}
}

func QueryParams(params map[string]string) Option {
	return func(builder *Builder) error {
		builder.QueryParams = params
		return nil
	}
}

func JSONataExpression(expr string) Option {
	return func(builder *Builder) error {
		builder.JSONataExpression = expr
		return nil
	}
}
