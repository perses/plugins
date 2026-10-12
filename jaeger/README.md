# Jaeger Datasource Plugin

### How to install

This plugin requires react and react-dom 18.

Install peer dependencies:

```bash
npm install react@18 react-dom@18
```

Install the plugin:

```bash
npm install @perses-dev/jaeger-plugin
```

## Compatibility

The plugin reads traces from the Jaeger query API v3 (`/api/v3/traces`, `/api/v3/services` and `/api/v3/operations`).
Jaeger 2.21 removed the older `/api/traces`, `/api/services` and `/api/operations` endpoints, so the plugin no longer
uses them.

It has been tested with Jaeger 2.10 to 2.22. Filtering the search by span kind needs Jaeger 2.20 or later; older
releases ignore that filter.

If the datasource uses the Perses proxy, its allowed endpoints must include `GET /api/v3/traces`,
`GET /api/v3/services` and `GET /api/v3/operations`. Datasources created before this change allow the older paths and
have to be updated.

## Development

### Setup

Install dependencies:

```bash
npm install
```

### Get Started

Start the dev server:

```bash
npm run dev
```

Build the plugin for distribution:

```bash
npm run build
```
