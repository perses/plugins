import { AnnotationData, AnnotationDisplay } from '@perses-dev/spec';
import { AnnotationDefinitionWithData } from '@perses-dev/dashboards';

export type TimeSeriesAnnotation = AnnotationData & AnnotationDisplay;

export function convertAnnotationToTimeSeriesAnnotation(
  annotations: AnnotationDefinitionWithData[]
): TimeSeriesAnnotation[] {
  const result: TimeSeriesAnnotation[] = [];
  for (const annotation of annotations) {
    for (const item of annotation.data) {
      result.push({
        ...annotation.definition.spec.display,
        ...item,
      });
    }
  }
  return result;
}
