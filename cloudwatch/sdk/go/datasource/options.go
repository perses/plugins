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
	"strings"

	"github.com/perses/spec/go/common"
)

// URL replaces the URL of the CloudWatch API, for example to use a VPC endpoint.
func URL(endpoint string) Option {
	return func(builder *Builder) error {
		if !strings.HasPrefix(endpoint, "https://") {
			return fmt.Errorf("the CloudWatch API must be reached with HTTPS")
		}
		url, err := common.ParseURL(endpoint)
		if err != nil {
			return err
		}
		builder.Proxy.Spec.URL = url
		return nil
	}
}
