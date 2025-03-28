# Label Names Variable Builder

The Label Names Variable builder helps creating prometheus label names variables in the format expected by Perses.

## Usage

```cue
package myDaC

import (
	labelNamesVarBuilder "github.com/perses/plugins/prometheus/sdk/cue/variable/labelnames"
)

labelNamesVarBuilder & {} // input parameters expected
```

## Parameters

| Parameter          | Type                                                                             | Mandatory/Optional | Default | Description                                                                                                                                                       |
|--------------------|----------------------------------------------------------------------------------|--------------------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `#name`            | string                                                                           | Mandatory          |         | The name of this variable.                                                                                                                                        |
| `#datasourceName`  | string                                                                           | Mandatory          |         | The name of the datasource to query.                                                                                                                              |
| `#allowAllValue`   | boolean                                                                          | Optional           | false   | Whether to append the "All" value to the list.                                                                                                                    |
| `#allowMultiple`   | boolean                                                                          | Optional           | false   | Whether to allow multi-selection of values.                                                                                                                       |
| `#capturingRegexp` | string                                                                           | Optional           |         | Regexp used to catch and filter the results of the query. If empty, then nothing is filtered (equivalent of setting it to `(.*)`).                                |
| `#customAllValue`  | string                                                                           | Optional           |         | Custom value that will be used if `#allowAllValue` is true and if `All` is selected.                                                                              |
| `#display`         | [Display](https://perses.dev/perses/docs/api/variable/#display-specification)    | Optional           |         | Display object to tune the display name, description and visibility (show/hide).                                                                                  |
| `#metric`          | string                                                                           | Optional           |         | The name of the source metric to be used. /!\ Mandatory if you want to rely on the standard query pattern, thus didn't provide a value to the `#query` parameter. |
| `#query`           | string                                                                           | Optional           |         | Custom query to be used for this variable. /!\ Mandatory if you didn't provide a value to the `#metric` parameter.                                                |
| `#sort`            | [Sort](https://perses.dev/perses/docs/api/variable/#list-variable-specification) | Optional           |         | Sort method to apply when rendering the list of values.                                                                                                           |

## Output

| Field      | Type                                                                            | Description                                               |
|------------|---------------------------------------------------------------------------------|-----------------------------------------------------------|
| `variable` | [Variable](https://perses.dev/perses/docs/api/variable/#variable-specification) | The final variable object, to be passed to the dashboard. |

## Example

```cue
package myDaC

import (
	labelNamesVarBuilder "github.com/perses/plugins/prometheus/sdk/cue/variable/labelnames"
)

{labelNamesVarBuilder & {
	#name:           "namespaceLabels"
	#metric:         "kube_namespace_labels"
	#datasourceName: "promDemo"
}}.variable
```
