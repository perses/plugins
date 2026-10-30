# Markdown model

```yaml
kind: "Markdown"
spec:
  text: <string>
  enableHtml: <boolean> # Optional
```

## Spec fields

- `text`: the Markdown text displayed in the panel. Dashboard variables are replaced before rendering.
- `enableHtml`: when `true`, raw HTML tags in `text` are rendered (after sanitization, which strips scripts and other
  unsafe content). Defaults to `false`: raw HTML is then escaped and displayed as plain text, so placeholders such as
  `<host>:<port>` are kept.
