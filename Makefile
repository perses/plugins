# Copyright 2025 The Perses Authors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

GO ?= go
MDOX ?= mdox

.PHONY: lint-plugins
lint-plugins:
	@echo ">> Lint all plugins"
	$(GO) run ./scripts/lint-plugins/lint-plugins.go

.PHONY: tidy-modules
tidy-modules:
	@echo ">> Tidy CUE module for all plugins"
	$(GO) run ./scripts/tidy-modules/tidy-modules.go

.PHONY: checkdocs
checkdocs:
	@echo ">> check format markdown docs"
	@make fmt-docs
	@git diff --exit-code -- *.md

.PHONY: fmt-docs
fmt-docs:
	@echo ">> format markdown document"
	$(MDOX) fmt --soft-wraps -l $$(find . -name '*.md' -not -path "**/node_modules/*" -print) --links.validate.config-file=./.mdox.validate.yaml
