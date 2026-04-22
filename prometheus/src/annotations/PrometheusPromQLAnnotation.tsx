import { AnnotationPlugin, AnnotationQueryQueryPluginDependencies, parseVariables } from '@perses-dev/plugin-system';
import { PrometheusPromQLAnnotationOptions } from '../plugins';
import { PrometheusPromQLAnnotationOptionEditor } from './PrometheusPromQLAnnotationOptionEditor';
import { getAnnotationData } from './get-annotation-data';

export const PrometheusPromQLAnnotation: AnnotationPlugin<PrometheusPromQLAnnotationOptions> = {
  getAnnotationData: getAnnotationData,
  dependsOn: (spec: PrometheusPromQLAnnotationOptions): AnnotationQueryQueryPluginDependencies => {
    const queryVariables = parseVariables(spec.expr);
    return {
      variables: [...queryVariables],
    };
  },
  OptionsEditorComponent: PrometheusPromQLAnnotationOptionEditor,
  createInitialOptions: () => ({ expr: '' }),
};
