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

// Package validation provides PromQL syntax validation for the Prometheus plugin.
// It is a standalone module with no dependency on Perses core, allowing it to be
// imported by both the Perses backend and the perses-operator without circular deps.
package validation

import (
	"fmt"
	"regexp"

	"github.com/prometheus/prometheus/promql/parser"
)

var variableRefRegexp = regexp.MustCompile(`\$\{?\w+`)

// ValidatePromQLExpr validates a PromQL expression string.
// Returns nil if the expression is valid.
// Expressions containing Perses variable references ($var or ${var}) are skipped
// and return nil, since they cannot be parsed without substitution.
func ValidatePromQLExpr(expr string) error {
	if expr == "" {
		return nil
	}
	if variableRefRegexp.MatchString(expr) {
		return nil
	}
	_, err := parser.NewParser(parser.Options{}).ParseExpr(expr)
	if err != nil {
		return fmt.Errorf("invalid PromQL: %w", err)
	}
	return nil
}

// ContainsVariableRef reports whether the expression contains Perses variable
// references ($var or ${var}).
func ContainsVariableRef(expr string) bool {
	return variableRefRegexp.MatchString(expr)
}
