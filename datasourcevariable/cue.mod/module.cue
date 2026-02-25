module: "github.com/perses/plugins/datasourcevariable@v0"
language: {
	version: "v0.15.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-rc.2"
		default: true
	}
	"github.com/perses/plugins/loki@v0": {
		v:       "v0.5.0-rc.1"
		default: true
	}
	"github.com/perses/plugins/prometheus@v0": {
		v:       "v0.56.0"
		default: true
	}
	"github.com/perses/plugins/pyroscope@v0": {
		v:       "v0.5.0-rc.1"
		default: true
	}
	"github.com/perses/plugins/tempo@v0": {
		v:       "v0.56.0"
		default: true
	}
	"github.com/perses/shared/cue@v0": {
		v:       "v0.53.0"
		default: true
	}
}
