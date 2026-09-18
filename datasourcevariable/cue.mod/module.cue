module: "github.com/perses/plugins/datasourcevariable@v0"
language: {
	version: "v0.16.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.55.0-beta.1"
		default: true
	}
	"github.com/perses/plugins/jaeger@v0": {
		v:       "v0.2.0-beta.4"
		default: true
	}
	"github.com/perses/plugins/loki@v0": {
		v:       "v0.7.0-beta.4"
		default: true
	}
	"github.com/perses/plugins/opensearch@v0": {
		v:       "v0.2.0-beta.4"
		default: true
	}
	"github.com/perses/plugins/prometheus@v0": {
		v:       "v0.59.0-beta.4"
		default: true
	}
	"github.com/perses/plugins/pyroscope@v0": {
		v:       "v0.7.0-beta.4"
		default: true
	}
	"github.com/perses/plugins/tempo@v0": {
		v:       "v0.60.0-beta.4"
		default: true
	}
	"github.com/perses/shared/cue@v0": {
		v:       "v0.55.0-beta.10"
		default: true
	}
	"github.com/perses/spec/cue@v0": {
		v:       "v0.3.0-beta.8"
		default: true
	}
}
