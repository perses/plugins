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

.PHONY: test-schemas-plugins
test-schemas-plugins:
	@echo ">> Test schemas of all plugins"
	$(GO) run ./scripts/test-schemas-plugins/test-schemas-plugins.go

.PHONY: tidy-modules
tidy-modules:
	@echo ">> Tidy CUE module for all plugins"
	$(GO) run ./scripts/tidy-modules/tidy-modules.go

.PHONY: checkdocs
checkdocs:
	@echo ">> Check markdown docs format"
	@make fmt-docs
	@git diff --exit-code -- *.md

.PHONY: fmt-docs
fmt-docs:
	@echo ">> Format markdown documents"
	$(MDOX) fmt --soft-wraps -l $$(find . -name '*.md' -not -path "**/node_modules/*" -print) --links.validate.config-file=./.mdox.validate.yaml

.PHONY: golangci-lint
golangci-lint:
	@echo ">> Run golangci-lint on all plugins"
	$(GO) run ./scripts/golangci-lint/golangci-lint.go

.PHONY: build
build:
	@echo ">> Build all plugins"
	$(GO) run ./scripts/build-plugins/build-plugins.go

.PHONY: test
test:
	@echo ">> Run all tests"
	$(GO) test -count=1 -v ./...

.PHONY: checklicense
checklicense:
	@echo ">> Check license"
	$(GO) run ./scripts/check-license --check

.PHONY: fixlicense
fixlicense:
	@echo ">> Add license header where it's missing"
	$(GO) run ./scripts/check-license --fix

.PHONY: fmt-cue
fmt-cue:
	@echo ">> Format CUE files"
	./scripts/cue.sh --fmt

.PHONY: checkformat-cue
checkformat-cue:
	@echo ">> Check CUE files format"
	./scripts/cue.sh --checkformat