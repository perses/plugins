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

package datasource

import (
	"github.com/perses/perses/go-sdk/http"
)

func DirectURL(url string) Option {
	return func(builder *Builder) error {
		builder.DirectURL = url
		return nil
	}
}

// HTTPProxy reaches the API of ClickStack through the Perses proxy: url is the URL of the API, e.g.
// "http://clickstack:8000". Its secret holds the API key of ClickStack as a bearer token.
func HTTPProxy(url string, options ...http.Option) Option {
	return func(builder *Builder) error {
		p, err := http.New(url, options...)
		if err != nil {
			return err
		}
		builder.Proxy = &p.Proxy
		return nil
	}
}

// UIURL sets the URL of the ClickStack UI, as users open it in their browser. The alerts link to the dashboard or
// the saved search they watch.
func UIURL(url string) Option {
	return func(builder *Builder) error {
		builder.UIURL = url
		return nil
	}
}
