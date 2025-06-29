// Copyright 2025 The Perses Authors
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

package histogram

import (
	"github.com/perses/perses/go-sdk/common"
)

func Format(format common.Format) Option {
	return func(builder *Builder) error {
		builder.Format = &format
		return nil
	}
}

func Min(min float64) Option {
	return func(builder *Builder) error {
		builder.Min = min
		return nil
	}
}

func Max(max float64) Option {
	return func(builder *Builder) error {
		builder.Max = max
		return nil
	}
}

func Thresholds(thresholds common.Thresholds) Option {
	return func(builder *Builder) error {
		builder.Thresholds = &thresholds
		return nil
	}
}
