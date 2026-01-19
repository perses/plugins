module: "github.com/perses/plugins/datasourcevariable@v0"
language: {
	version: "v0.15.1"
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
