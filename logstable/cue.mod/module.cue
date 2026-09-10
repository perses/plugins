module: "github.com/perses/plugins/logstable@v0"
language: {
	version: "v0.16.1"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/shared/cue@v0": {
		v:       "v0.55.0-beta.7"
		default: true
	}
}
