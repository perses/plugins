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
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPluginSpecValidation(t *testing.T) {
	tests := []struct {
		name        string
		spec        PluginSpec
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid V1 with directUrl",
			spec: PluginSpec{
				DirectURL: "http://localhost:8086",
				Version:   VersionV1,
				Database:  "mydb",
			},
			expectError: false,
		},
		{
			name: "valid V3 with directUrl",
			spec: PluginSpec{
				DirectURL:    "http://localhost:8086",
				Version:      VersionV3,
				Organization: "myorg",
				Bucket:       "mybucket",
			},
			expectError: false,
		},
		{
			name: "missing directUrl and proxy",
			spec: PluginSpec{
				Version:  VersionV1,
				Database: "mydb",
			},
			expectError: true,
			errorMsg:    "directUrl or proxy cannot be empty",
		},
		{
			name: "missing version",
			spec: PluginSpec{
				DirectURL: "http://localhost:8086",
				Database:  "mydb",
			},
			expectError: true,
			errorMsg:    "version must be either 'v1' or 'v3'",
		},
		{
			name: "invalid version",
			spec: PluginSpec{
				DirectURL: "http://localhost:8086",
				Version:   "v2",
				Database:  "mydb",
			},
			expectError: true,
			errorMsg:    "version must be either 'v1' or 'v3'",
		},
		{
			name: "V1 missing database",
			spec: PluginSpec{
				DirectURL: "http://localhost:8086",
				Version:   VersionV1,
			},
			expectError: true,
			errorMsg:    "database is required for InfluxDB v1",
		},
		{
			name: "V3 missing organization",
			spec: PluginSpec{
				DirectURL: "http://localhost:8086",
				Version:   VersionV3,
				Bucket:    "mybucket",
			},
			expectError: true,
			errorMsg:    "organization is required for InfluxDB v3",
		},
		{
			name: "V3 missing bucket",
			spec: PluginSpec{
				DirectURL:    "http://localhost:8086",
				Version:      VersionV3,
				Organization: "myorg",
			},
			expectError: true,
			errorMsg:    "bucket is required for InfluxDB v3",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.spec.validate()
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPluginSpecUnmarshalJSON(t *testing.T) {
	tests := []struct {
		name        string
		json        string
		expectError bool
		expected    *PluginSpec
	}{
		{
			name: "valid V1 JSON",
			json: `{
				"directUrl": "http://localhost:8086",
				"version": "v1",
				"database": "mydb"
			}`,
			expectError: false,
			expected: &PluginSpec{
				DirectURL: "http://localhost:8086",
				Version:   VersionV1,
				Database:  "mydb",
			},
		},
		{
			name: "valid V3 JSON",
			json: `{
				"directUrl": "http://localhost:8086",
				"version": "v3",
				"organization": "myorg",
				"bucket": "mybucket"
			}`,
			expectError: false,
			expected: &PluginSpec{
				DirectURL:    "http://localhost:8086",
				Version:      VersionV3,
				Organization: "myorg",
				Bucket:       "mybucket",
			},
		},
		{
			name: "invalid JSON - missing required field",
			json: `{
				"directUrl": "http://localhost:8086",
				"version": "v1"
			}`,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var spec PluginSpec
			err := json.Unmarshal([]byte(tt.json), &spec)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.expected.DirectURL, spec.DirectURL)
				assert.Equal(t, tt.expected.Version, spec.Version)
				assert.Equal(t, tt.expected.Database, spec.Database)
				assert.Equal(t, tt.expected.Organization, spec.Organization)
				assert.Equal(t, tt.expected.Bucket, spec.Bucket)
			}
		})
	}
}

func TestSelectors(t *testing.T) {
	t.Run("SelectorV1", func(t *testing.T) {
		selector := SelectorV1("test-influxdb-v1")
		assert.Equal(t, PluginKindV1, selector.Kind)
		assert.Equal(t, "test-influxdb-v1", selector.Name)
	})

	t.Run("SelectorV3", func(t *testing.T) {
		selector := SelectorV3("test-influxdb-v3")
		assert.Equal(t, PluginKindV3, selector.Kind)
		assert.Equal(t, "test-influxdb-v3", selector.Name)
	})
}
