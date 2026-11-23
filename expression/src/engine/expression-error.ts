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

export type ErrorCode = 'syntax' | 'unknown_function' | 'unknown_reference' | 'no_match' | 'limit_exceeded' | 'aborted';

export interface ExpressionErrorInfo {
  code: ErrorCode;
  message: string;
}

export class ExpressionError extends Error {
  readonly info: ExpressionErrorInfo;

  constructor(info: ExpressionErrorInfo) {
    super(info.message);
    this.name = 'ExpressionError';
    this.info = info;
  }
}
