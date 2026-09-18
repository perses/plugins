module: "github.com/perses/plugins/staticlistvariable@v0"
language: {
	version: "v0.16.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.55.0-beta.2"
		default: true
	}
	"github.com/perses/spec/cue@v0": {
		v:       "v0.3.0-beta.9"
		default: true
	}
}
