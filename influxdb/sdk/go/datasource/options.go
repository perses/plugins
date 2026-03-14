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
	"github.com/perses/perses/pkg/model/api/v1/datasource/http"
)

// DirectURL sets the direct URL for the InfluxDB datasource
func DirectURL(url string) Option {
	return func(builder *Builder) error {
		builder.DirectURL = url
		return nil
	}
}

// HTTPProxy sets the proxy configuration for the InfluxDB datasource
func HTTPProxy(proxy *http.Proxy) Option {
	return func(builder *Builder) error {
		builder.Proxy = proxy
		return nil
	}
}

// Version sets the InfluxDB version
func Version(version InfluxDBVersion) Option {
	return func(builder *Builder) error {
		builder.Version = version
		return nil
	}
}

// Database sets the database name for InfluxDB V1
func Database(database string) Option {
	return func(builder *Builder) error {
		builder.Database = database
		return nil
	}
}

// Organization sets the organization for InfluxDB V3
func Organization(organization string) Option {
	return func(builder *Builder) error {
		builder.Organization = organization
		return nil
	}
}

// Bucket sets the bucket for InfluxDB V3
func Bucket(bucket string) Option {
	return func(builder *Builder) error {
		builder.Bucket = bucket
		return nil
	}
}
