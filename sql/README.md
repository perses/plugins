# SQL Plugin

A SQL datasource plugin for Perses that supports multiple SQL databases with interactive querying capabilities.

## Supported Databases

- **PostgreSQL** (with TimescaleDB support)
- **MySQL**
- **MariaDB**

## Features

- **SQL Datasource**: Configure connections to SQL databases via Perses proxy
- **Time Series Queries**: Query time-series data with automatic visualization
- **Explore Mode**: Interactive SQL query builder with Table and Graph views (Prometheus-style)
- **SQL Macros**: Use `$__timeFilter`, `$__timeFrom`, `$__timeTo`, `$__interval` in queries
- **Multi-Database Support**: Connect to PostgreSQL, MySQL, and MariaDB
- **TLS/SSL Support**: Secure connections with customizable SSL modes and certificate management
- **Secret Management**: Store credentials securely using Perses secrets
- **Connection Pooling**: Efficient connection management via backend proxy

## Installation

This plugin is part of the Perses plugins monorepo. Install dependencies:

```bash
cd perses/plugins/sql
npm install
```

## Usage

### Creating a SQL Datasource

1. Navigate to **Configuration → Datasources** in Perses UI
2. Click **Add Datasource**
3. Select **SQL Datasource**
4. Configure:
   - **Driver**: Choose database type (PostgreSQL, MySQL, or MariaDB)
   - **Host**: Database host and port (e.g., `localhost:5432`)
   - **Database**: Database name
   - **Secret**: Select a secret containing credentials (BasicAuth)
   - **SSL Mode** (PostgreSQL): `disable`, `require`, `verify-ca`, or `verify-full`
   - **TLS Certificates** (optional): CA cert, client cert, client key

### Using the Explore Mode

1. Navigate to **Explore** in Perses UI
2. Select **SQL Explorer**
3. Choose your SQL datasource
4. Write your SQL query in the editor
5. Switch between **Table** and **Graph** views
6. Click **Run Query** to execute

Example query:
```sql
SELECT 
  timestamp AS time,
  cpu_percent AS value,
  host
FROM system_metrics
WHERE $__timeFilter(timestamp)
ORDER BY timestamp DESC
LIMIT 100
```

### Time Series Queries in Dashboards

Add a panel to your dashboard:

1. **Add Panel**
2. Select **Query Type**: Time Series Query
3. Select **Plugin**: SQL Time Series Query
4. Select **Datasource**: Your SQL datasource
5. Write your query:

```sql
SELECT 
  time_bucket('$__interval seconds', timestamp) AS time,
  host AS label,
  AVG(cpu_percent) AS value
FROM system_metrics
WHERE $__timeFilter(timestamp)
GROUP BY time, host
ORDER BY time
```

### Available SQL Macros

The plugin automatically replaces these macros in your queries:

- **`$__timeFilter(column)`**: Generates `column >= 'start' AND column <= 'end'`
- **`$__timeFrom`**: Start timestamp of the time range
- **`$__timeTo`**: End timestamp of the time range  
- **`$__interval`**: Calculated interval in seconds (for time bucketing)
- **`$__interval_ms`**: Calculated interval in milliseconds

Example with macros:
```sql
SELECT 
  time_bucket('$__interval seconds', created_at) AS time,
  category,
  COUNT(*) AS count
FROM transactions
WHERE $__timeFilter(created_at)
  AND status = 'completed'
GROUP BY time, category
ORDER BY time
```

Gets transformed to:
```sql
SELECT 
  time_bucket('300 seconds', created_at) AS time,
  category,
  COUNT(*) AS count
FROM transactions
WHERE created_at >= '2026-01-25T10:00:00Z' AND created_at <= '2026-01-25T11:00:00Z'
  AND status = 'completed'
GROUP BY time, category
ORDER BY time
```

## Query Requirements

### For Time Series Visualization

Your query must return:
- **Time column**: Named `time` or aliased as `time` (timestamp format)
- **Value column**: Named `value` or aliased as `value` (numeric)
- **Label columns** (optional): For series differentiation (e.g., `host`, `sensor_id`)

### Supported Time Formats

- ISO 8601: `2026-01-25T10:00:00Z`
- Unix timestamp (seconds): `1706176800`
- Unix timestamp (milliseconds): `1706176800000`

## Database-Specific Features

### PostgreSQL / TimescaleDB

- Supports `time_bucket()` for time aggregation
- SSL modes: `disable`, `require`, `verify-ca`, `verify-full`
- Advanced connection options via PostgreSQL config

### MySQL / MariaDB

- Standard SQL queries
- TLS/SSL support
- Connection timeout and max connections configuration

## Development

### Prerequisites

- Node.js >= 22
- npm >= 10
- Docker (for test databases)

### Setup

```bash
# Install dependencies
npm install

# Start test databases
make db-up

# Run tests
npm test

# Type checking
npm run type-check

# Start development server
percli plugin start .
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Start test databases
make db-up

# Verify test data
make verify-all

# Stop databases
make db-down
```

## Architecture

- **Frontend** (TypeScript/React): Datasource editor, query editor, explore mode
- **Backend** (Go): SQL proxy in Perses core (`internal/api/impl/proxy/`)
- **Schemas** (CUE): Configuration validation

All database connections and query execution happen server-side via the Perses backend proxy for security.

## Examples

See `test-data/` directory for sample database schemas and queries:
- `test-data/postgres/` - PostgreSQL with TimescaleDB examples
- `test-data/mysql/` - MySQL examples  
- `test-data/mariadb/` - MariaDB examples

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Apache License 2.0
