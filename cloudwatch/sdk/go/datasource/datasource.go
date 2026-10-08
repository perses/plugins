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
	"fmt"
	"regexp"
	"strings"

	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/datasource/proxy/http"
)

const (
	PluginKind = "CloudWatchDatasource"
)

var regionRegexp = regexp.MustCompile(`^[a-z]{2}(-[a-z]+)+-[0-9]{1,2}$`)

// PluginSpec is the spec of the CloudWatch datasource. The requests are sent through the HTTP proxy of the Perses
// server, which signs them with the SigV4 credentials of the secret.
type PluginSpec struct {
	Proxy *http.Proxy `json:"proxy" yaml:"proxy"`
}

type Option func(plugin *Builder) error

type Builder struct {
	PluginSpec `json:",inline" yaml:",inline"`
}

// Endpoint returns the URL of the CloudWatch API of a region.
func Endpoint(region string) string {
	if strings.HasPrefix(region, "cn-") {
		return fmt.Sprintf("https://monitoring.%s.amazonaws.com.cn", region)
	}
	return fmt.Sprintf("https://monitoring.%s.amazonaws.com", region)
}

func create(region string, secretName string, options ...Option) (Builder, error) {
	if !regionRegexp.MatchString(region) {
		return Builder{}, fmt.Errorf("%q is not a valid AWS region", region)
	}
	if len(secretName) == 0 {
		return Builder{}, fmt.Errorf("a secret with the SigV4 credentials is required to query CloudWatch")
	}
	url, err := common.ParseURL(Endpoint(region))
	if err != nil {
		return Builder{}, err
	}
	builder := &Builder{
		PluginSpec: PluginSpec{
			Proxy: &http.Proxy{
				Kind: "HTTPProxy",
				Spec: http.Config{
					URL: url,
					// The CloudWatch API is a single endpoint: every operation is a POST on the root path.
					AllowedEndpoints: []http.AllowedEndpoint{{EndpointPattern: common.MustNewRegexp("^/$"), Method: "POST"}},
					Secret:           secretName,
				},
			},
		},
	}

	for _, opt := range options {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

// CloudWatch defines a datasource querying the CloudWatch API of the given region. The secret must define the SigV4
// configuration (with the service name "monitoring") used by the Perses server to sign the requests.
func CloudWatch(region string, secretName string, options ...Option) datasource.Option {
	return func(builder *datasource.Builder) error {
		plugin, err := create(region, secretName, options...)
		if err != nil {
			return err
		}

		builder.Spec.Plugin.Kind = PluginKind
		builder.Spec.Plugin.Spec = plugin.PluginSpec
		return nil
	}
}

func Selector(datasourceName string) *datasource.Selector {
	return &datasource.Selector{
		Kind: PluginKind,
		Name: datasourceName,
	}
}
