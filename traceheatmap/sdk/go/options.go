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

package traceheatmap

import "fmt"

func WithBins(bins int) Option {
	return func(builder *Builder) error {
		if bins < 0 {
			return fmt.Errorf("bins must be a positive integer, got %d", bins)
		}
		if bins > 100 {
			return fmt.Errorf("bins cannot exceed 100 for performance reasons")
		}

		builder.DistributionSettings.Bins = bins
		return nil
	}
}

func WithScale(scale string) Option {
	return func(builder *Builder) error {
		if scale != ScaleLinear && scale != ScaleLogarithmic {
			return fmt.Errorf("invalid scale %q: must be either %q or %q", scale, ScaleLinear, ScaleLogarithmic)
		}
		builder.DistributionSettings.Scale = scale
		return nil
	}
}

func WithMin(min int) Option {
	return func(builder *Builder) error {
		if min < 0 {
			return fmt.Errorf("min must be a positive integer, got %d", min)
		}

		if min >= builder.DistributionSettings.Max {
			return fmt.Errorf("min can not be gte max (%d), got %d", builder.DistributionSettings.Max, min)
		}

		builder.DistributionSettings.Min = min
		return nil
	}
}

func WithMax(max int) Option {
	return func(b *Builder) error {
		if max <= 0 {
			return fmt.Errorf("max must be a none-zero positive integer, got %d", max)
		}
		if max <= b.DistributionSettings.Min {
			return fmt.Errorf("max (%d) must be greater than min (%d)", max, b.DistributionSettings.Min)
		}
		if max > 5000 {
			return fmt.Errorf("max cannot exceed 5000ms")
		}
		b.DistributionSettings.Max = max
		return nil
	}
}

func WithOverflowStrategy(strategy string) Option {
	return func(b *Builder) error {
		if strategy != OverflowClamp && strategy != OverflowFilter {
			return fmt.Errorf("invalid overflow strategy %q: must be either %q or %q",
				strategy, OverflowClamp, OverflowFilter)
		}
		b.DistributionSettings.OverflowStrategy = strategy
		return nil
	}
}
