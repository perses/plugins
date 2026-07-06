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

package validation

import (
	"testing"
)

func TestValidatePromQLExpr_Valid(t *testing.T) {
	tests := []struct {
		name string
		expr string
	}{
		{"simple metric", "up"},
		{"rate function", "rate(http_requests_total[5m])"},
		{"aggregation", "sum(rate(http_requests_total[5m])) by (job)"},
		{"histogram quantile", "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"},
		{"binary expression", "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes"},
		{"label matchers", `http_requests_total{method="GET", status=~"2.."}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ValidatePromQLExpr(tt.expr); err != nil {
				t.Errorf("ValidatePromQLExpr(%q) returned error: %v", tt.expr, err)
			}
		})
	}
}

func TestValidatePromQLExpr_Invalid(t *testing.T) {
	tests := []struct {
		name string
		expr string
	}{
		{"unclosed bracket", "rate(up[)"},
		{"unclosed paren", "sum(rate(up[5m])"},
		{"trailing brace", "up{"},
		{"missing operand", "sum by()"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePromQLExpr(tt.expr)
			if err == nil {
				t.Errorf("ValidatePromQLExpr(%q) expected error, got nil", tt.expr)
			}
		})
	}
}

func TestValidatePromQLExpr_VariableRefsSkipped(t *testing.T) {
	tests := []struct {
		name string
		expr string
	}{
		{"dollar variable", `rate(http_requests_total{namespace="$namespace"}[5m])`},
		{"braced variable", `rate(http_requests_total{namespace="${namespace}"}[5m])`},
		{"variable in metric", `$metric_name`},
		{"multiple variables", `rate(${metric}{job="$job"}[$__rate_interval])`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ValidatePromQLExpr(tt.expr); err != nil {
				t.Errorf("ValidatePromQLExpr(%q) should skip variable refs, got: %v", tt.expr, err)
			}
		})
	}
}

func TestValidatePromQLExpr_Empty(t *testing.T) {
	if err := ValidatePromQLExpr(""); err != nil {
		t.Errorf("ValidatePromQLExpr(\"\") expected nil, got: %v", err)
	}
}

func TestContainsVariableRef(t *testing.T) {
	tests := []struct {
		expr     string
		expected bool
	}{
		{`up`, false},
		{`rate(up[5m])`, false},
		{`$namespace`, true},
		{`${namespace}`, true},
		{`rate(up{job="$job"}[5m])`, true},
	}
	for _, tt := range tests {
		t.Run(tt.expr, func(t *testing.T) {
			if got := ContainsVariableRef(tt.expr); got != tt.expected {
				t.Errorf("ContainsVariableRef(%q) = %v, want %v", tt.expr, got, tt.expected)
			}
		})
	}
}
