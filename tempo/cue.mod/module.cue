module: "github.com/perses/plugins/tempo@v0"
language: {
	version: "v0.12.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.52.0-beta.0"
		default: true
	}
}
