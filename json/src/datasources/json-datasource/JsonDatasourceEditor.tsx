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

import { HTTPSettingsEditor } from "@perses-dev/plugin-system";
import React, { ReactElement } from "react";
import { JsonDatasourceSpec } from "./json-datasource-types";

export interface JsonDatasourceEditorProps {
  value: JsonDatasourceSpec;
  onChange: (next: JsonDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function JsonDatasourceEditor({ value, onChange, isReadonly }: JsonDatasourceEditorProps): ReactElement {
  const initialSpecDirect: JsonDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: JsonDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [],
        url: '',
      },
    },
  };

  return (
    <HTTPSettingsEditor
      value={value}
      onChange={onChange}
      isReadonly={isReadonly}
      initialSpecDirect={initialSpecDirect}
      initialSpecProxy={initialSpecProxy}
    />
  );
}
