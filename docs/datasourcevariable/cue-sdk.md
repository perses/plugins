# Datasource Variable CUE SDK

This library helps creating datasource variables in the format expected by Perses.

## Usage

```cue
package myDaC

import (
	datasourceVarBuilder "github.com/perses/plugins/datasourcevariable/sdk/cue"
)

datasourceVarBuilder & {} // input parameters expected
```

## Parameters

| Parameter               | Type                                                                             | Mandatory/Optional | Default | Description                                                                                                                        |
|-------------------------|----------------------------------------------------------------------------------|--------------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| `#name`                 | string                                                                           | Mandatory          |         | The name of this variable.                                                                                                         |
| `#datasourcePluginKind` | string                                                                           | Mandatory          |         | The kind of datasource plugin that this variable should reference (e.g., "PrometheusDatasource", "TempoDatasource", etc.).         |
| `#display`              | [Display](https://perses.dev/perses/docs/api/variable/#display-specification)    | Optional           |         | Display object to tune the display name, description and visibility (show/hide).                                                   |
| `#allowAllValue`        | boolean                                                                          | Optional           | false   | Whether to append the "All" value to the list.                                                                                     |
| `#allowMultiple`        | boolean                                                                          | Optional           | false   | Whether to allow multi-selection of values.                                                                                        |
| `#customAllValue`       | string                                                                           | Optional           |         | Custom value that will be used if `#allowAllValue` is true and if `All` is selected.                                               |
| `#capturingRegexp`      | string                                                                           | Optional           |         | Regexp used to catch and filter the results of the query. If empty, then nothing is filtered (equivalent of setting it to `(.*)`). |
| `#sort`                 | [Sort](https://perses.dev/perses/docs/api/variable/#list-variable-specification) | Optional           |         | Sort method to apply when rendering the list of values.                                                                            |

## Output

| Field      | Type                                                                            | Description                                               |
|------------|---------------------------------------------------------------------------------|-----------------------------------------------------------|
| `variable` | [Variable](https://perses.dev/perses/docs/api/variable/#variable-specification) | The final variable object, to be passed to the dashboard. |

## Example

```cue
package myDaC

import (
	datasourceVarBuilder "github.com/perses/plugins/datasourcevariable/sdk/cue"
)

{datasourceVarBuilder & {
	#name:                  "datasource"
	#datasourcePluginKind:  "PrometheusDatasource"
	#display: {
		name: "Prometheus Instance"
		description: "Select the Prometheus datasource to use"
	}
}}.variable
```
