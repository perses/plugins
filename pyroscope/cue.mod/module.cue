module: "github.com/perses/plugins/pyroscope@v0"
language: {
	version: "v0.14.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-beta.0"
		default: true
	}
}
