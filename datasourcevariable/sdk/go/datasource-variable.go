package datasourcevariable

import (
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
)

type PluginSpec struct {
	DatasourcePluginKind string `json:"datasourcePluginKind" yaml:"datasourcePluginKind"`
}

type Builder struct {
	PluginSpec
}

type Option func(plugin *Builder) error

func create(datasourcePluginKind string, options ...Option) (Builder, error) {
	builder := &Builder{
		PluginSpec: PluginSpec{},
	}

	defaults := []Option{
		DatasourcePluginKind(datasourcePluginKind),
	}

	for _, opt := range append(defaults, options...) {
		if err := opt(builder); err != nil {
			return *builder, err
		}
	}

	return *builder, nil
}

const PluginKind = "DatasourceVariable"

func Datasource(datasourcePluginKind string, options ...Option) listvariable.Option {
	return func(builder *listvariable.Builder) error {
		r, err := create(datasourcePluginKind, options...)
		if err != nil {
			return err
		}
		builder.ListVariableSpec.Plugin.Kind = PluginKind
		builder.ListVariableSpec.Plugin.Spec = r
		return nil
	}
}
