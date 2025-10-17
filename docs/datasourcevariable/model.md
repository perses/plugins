# DatasourceVariable model

```yaml
kind: "DatasourceVariable"
spec:
  datasourcePluginKind: <string>
```

`datasourcePluginKind` value must be a valid datasource plugin kind, such as:
- `"PrometheusDatasource"`
- `"TempoDatasource"`
- `"LokiDatasource"`
- `"PyroscopeDatasource"`
- `"ClickHouseDatasource"`
- `"VictoriaLogsDatasource"`
