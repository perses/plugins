module: "github.com/perses/plugins/loki@v0"
language: {
	version: "v0.15.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/shared/cue@v0": {
		v:       "v0.53.0-rc.1"
		default: true
	}
}
