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

package panel

func Wrap(wrap bool) Option {
	return func(builder *Builder) error {
		builder.Wrap = &wrap
		return nil
	}
}

func EnableDetails(enable bool) Option {
	return func(builder *Builder) error {
		builder.EnableDetails = &enable
		return nil
	}
}

func Time(show bool) Option {
	return func(builder *Builder) error {
		builder.Time = &show
		return nil
	}
}

func WithWrap() Option {
	return Wrap(true)
}

func WithoutWrap() Option {
	return Wrap(false)
}

func WithDetails() Option {
	return EnableDetails(true)
}

func WithoutDetails() Option {
	return EnableDetails(false)
}

func WithTime() Option {
	return Time(true)
}

func WithoutTime() Option {
	return Time(false)
}
