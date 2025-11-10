module: "github.com/perses/plugins/table@v0"
language: {
	version: "v0.14.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.53.0-beta.2"
		default: true
	}
}
