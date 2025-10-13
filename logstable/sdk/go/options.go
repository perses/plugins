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

package logstable

func AllowWrap(allowWrap bool) Option {
	return func(builder *Builder) error {
		builder.AllowWrap = &allowWrap
		return nil
	}
}

func EnableDetails(enable bool) Option {
	return func(builder *Builder) error {
		builder.EnableDetails = &enable
		return nil
	}
}

func ShowTime(showTime bool) Option {
	return func(builder *Builder) error {
		builder.ShowTime = &showTime
		return nil
	}
}
