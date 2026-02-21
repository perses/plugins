module: "github.com/perses/plugin/sql@v0"
language: {
	version: "v0.9.2"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-rc.0"
		default: true
	}
	"github.com/perses/shared/cue@v0": {
		v:       "v0.53.0-rc.1"
		default: true
	}
}
