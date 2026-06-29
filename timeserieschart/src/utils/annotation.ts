// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { AnnotationData, AnnotationDisplay } from '@perses-dev/spec';
import { AnnotationSpecWithData } from '@perses-dev/dashboards';

export type TimeSeriesAnnotation = AnnotationData & AnnotationDisplay;

export function convertAnnotationToTimeSeriesAnnotation(annotations: AnnotationSpecWithData[]): TimeSeriesAnnotation[] {
  const result: TimeSeriesAnnotation[] = [];
  for (const annotation of annotations) {
    for (const item of annotation.data) {
      if (annotation.definition.display.hidden) {
        continue;
      }
      result.push({
        ...annotation.definition.display,
        ...item,
      });
    }
  }
  return result;
}
