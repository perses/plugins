module: "github.com/perses/plugins/influxdb@v0"
language: {
	version: "v0.8.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-rc.0"
		default: true
	}
}
