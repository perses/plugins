# Static List Variable Builder

## Example

```golang
import staticlist "github.com/perses/plugins/staticlistvariable/sdk/go/static-list"

staticListOptions := []staticlist.Option{
	staticlist.Values("abc", "def"),
}
staticlist.StaticList(staticListOptions...)
```
