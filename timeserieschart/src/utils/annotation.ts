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
        start: item.start * 1000,
        end: item.end ? item.end * 1000 : undefined,
      });
    }
  }
  return result;
}
