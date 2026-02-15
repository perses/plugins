module: "github.com/perses/plugins/influxdb@v0"
language: {
	version: "v0.9.0-alpha.0"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-rc.0"
		default: true
	}
	"github.com/perses/shared/cue@v0": {
		v: "v0.53.0-rc.1"
	}
}
