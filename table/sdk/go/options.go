// Copyright 2024 The Perses Authors
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

package table

import (
	"github.com/perses/perses/go-sdk/common"
)

func WithDensity(density Density) Option {
	return func(builder *Builder) error {
		builder.Density = density
		return nil
	}
}

func WithDefaultColumWidth(width int) Option {
	return func(builder *Builder) error {
		builder.DefaultColumnWidth = width
		return nil
	}
}

func WithDefaultColumHeight(height int) Option {
	return func(builder *Builder) error {
		builder.DefaultColumnHeight = height
		return nil
	}
}

func WithDefaultColumnHidden(hidden bool) Option {
	return func(builder *Builder) error {
		builder.DefaultColumnHidden = hidden
		return nil
	}
}

func WithDefaultPagination(enabled bool) Option {
	return func(builder *Builder) error {
		builder.Pagination = enabled
		return nil
	}
}

func WithColumnSettings(settings []ColumnSettings) Option {
	return func(builder *Builder) error {
		builder.ColumnSettings = settings
		return nil
	}
}

func WithCellSettings(settings []CellSettings) Option {
	return func(builder *Builder) error {
		builder.CellSettings = settings
		return nil
	}
}

func Transform(transforms []common.Transform) Option {
	return func(builder *Builder) error {
		builder.Transforms = transforms
		return nil
	}
}
