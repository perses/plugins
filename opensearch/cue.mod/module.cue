module: "github.com/perses/plugins/opensearch@v0"
language: {
	version: "v0.15.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/shared/cue@v0": {
		v:       "v0.55.0-beta.1"
		default: true
	}
	"github.com/perses/spec/cue@v0": {
		v:       "v0.3.0-beta.1"
		default: true
	}
}
