# Contributing to SQL Plugin
Thank you for your interest in contributing to the Perses SQL Plugin!
## Development Setup
1. **Prerequisites**
   - Node.js >= 22
   - npm >= 10
   - Docker (for test databases)
2. **Install Dependencies**
   ```bash
   cd perses/plugins/sql
   npm install
   ```
3. **Start Development Server**
   ```bash
   # In perses main repository, enable dev mode
   # Update config.yaml:
   plugin:
     enable_dev: true
   # Start backend
   ./bin/perses --config ./dev/config.yaml --log.level=debug
   # In a new terminal, start SQL plugin
   cd plugins/sql
   percli plugin start .
   ```
## Architecture
The SQL plugin consists of several components:
### TypeScript/React (Frontend)
- **Datasource Plugin** (`src/datasources/sql-datasource/`): Configuration UI for SQL datasources
  - `SQLDatasource.tsx` - Plugin implementation
  - `SQLDatasourceEditor.tsx` - UI editor component
  - `sql-datasource-types.ts` - TypeScript types
- **Query Plugin** (`src/queries/sql-time-series-query/`): SQL Time Series Query editor
  - `SQLTimeSeriesQuery.tsx` - Query plugin implementation  
  - `SQLTimeSeriesQueryEditor.tsx` - Query editor UI
  - `sql-time-series-query-types.ts` - TypeScript types
- **Explore Plugin** (`src/explore/`): SQL Explorer for interactive querying
  - `SQLExplorer.tsx` - Prometheus-style explorer with Table & Graph tabs
  - Uses `MultiQueryEditor` and `DataQueriesProvider` from Perses plugin system
  - Supports TimeSeriesChart and TimeSeriesTable visualization
- **Model** (`src/model/`): Utility functions
  - `replace-sql-builtin-variables.ts` - SQL macro replacement ($__timeFilter, etc.)
  - `sql-client.ts` - HTTP client for query execution
### Backend (Perses Core)
- **SQL Proxy** (`internal/api/impl/proxy/proxy.go` in Perses main repository)
  - Handles all SQL queries via backend proxy
  - Connects to databases (PostgreSQL, MySQL, MariaDB)
  - Executes queries and returns JSON
  - Handles authentication and TLS
### Schemas
- **CUE Schemas** (`schemas/`)
  - `datasource/sql.cue` - SQL datasource configuration validation
  - `sql-time-series-query/sql-time-series-query.cue` - Query configuration validation
### Test Data
- **Test Databases** (`test-data/`)
  - PostgreSQL sample data (`test-data/postgres/`)
  - MySQL sample data (`test-data/mysql/`)
  - MariaDB sample data (`test-data/mariadb/`)
## Adding New Features
### Adding a New SQL Driver
1. **Update Backend** (`internal/api/impl/proxy/proxy.go` in Perses core)
   - Add driver support in `sqlOpen()` function
   - Add driver-specific connection string handling
2. **Update Frontend Types** (`src/datasources/sql-datasource/sql-datasource-types.ts`)
   ```typescript
   export type SQLDriver = 'postgres' | 'mysql' | 'mariadb' | 'your-driver';
   ```
3. **Update UI** (`src/datasources/sql-datasource/SQLDatasourceEditor.tsx`)
   - Add driver option to the Select component
   - Add driver-specific configuration fields if needed
4. **Update CUE Schema** (`schemas/datasource/sql.cue`)
   - Add driver to allowed values
5. **Add Test Data** (`test-data/your-driver/`)
   - Create `init.sql` and `sample-data.sql`
   - Update `docker-compose.test.yaml`
### Adding a New Query Type
1. **Create Query Directory**
   ```bash
   mkdir -p src/queries/your-query-type
   ```
2. **Implement Query Plugin**
   - Create `YourQuery.tsx` following `SQLTimeSeriesQuery.tsx` pattern
   - Implement `getTimeSeriesData()` or appropriate data fetching method
   - Create `YourQueryEditor.tsx` for UI
3. **Add Types**
   - Create `your-query-types.ts` with spec interfaces
4. **Register Plugin**
   - Export from `src/queries/index.ts`
   - Add to `package.json` perses.plugins array
   - Add to `rsbuild.config.ts` Module Federation exposes
5. **Add CUE Schema**
   - Create `schemas/your-query-type/your-query-type.cue`
### Adding SQL Macros
SQL macros are processed in `src/model/replace-sql-builtin-variables.ts`.
**Existing Macros:**
- `$__timeFilter(column)` - Generates WHERE clause for time range
- `$__timeFrom` - Start of time range
- `$__timeTo` - End of time range
- `$__interval` - Interval in seconds
- `$__interval_ms` - Interval in milliseconds
**To Add New Macro:**
1. **Add macro processing logic** in `replace-sql-builtin-variables.ts`
   ```typescript
   export function replaceSQLBuiltinVariables(...) {
     // ...existing code...
     // Add your macro replacement
     query = query.replace(/\$__yourMacro/g, 'replacement');
     return query;
   }
   ```
2. **Add tests** in `replace-sql-builtin-variables.test.ts`
   ```typescript
   it('should replace $__yourMacro', () => {
     const result = replaceSQLBuiltinVariables('SELECT * WHERE $__yourMacro', ...);
     expect(result).toBe('SELECT * WHERE replacement');
   });
   ```
3. **Document in README.md**
## Testing
### Run Unit Tests
```bash
# All tests
npm test
# Watch mode
npm test -- --watch
# With coverage
npm test -- --coverage
```
### Type Checking
```bash
npm run type-check
```
### Start Test Databases
```bash
# Start all databases (PostgreSQL, MySQL, MariaDB)
make db-up
# Verify test data
make verify-all
# Stop databases
make db-down
# Clean all (including volumes)
make db-clean
```
### Test Individual Database
```bash
# PostgreSQL
make verify-postgres
# MySQL  
make verify-mysql
# MariaDB
make verify-mariadb
```
## Building
```bash
# Build the plugin
npm run build
# Build for Module Federation
npm run build-mf
# Type checking
npm run type-check
```
## Development Workflow
### 1. Make Changes
Edit files in `src/` directory
### 2. Test Locally
```bash
# Start backend (in perses main repo)
./bin/perses --config ./dev/config.yaml --log.level=debug
# Start plugin (in plugins/sql)
percli plugin start .
# Plugin will rebuild automatically on file changes
```
### 3. Test Changes
- Open browser to Perses UI
- Create/edit SQL datasource
- Create dashboard with SQL query
- Test Explore mode
### 4. Run Tests
```bash
npm test
npm run type-check
```
## Code Style
- **TypeScript** for all new code
- **Follow existing patterns** in the codebase
- **JSDoc comments** for public APIs
- **Functional components** with React Hooks
- **Named exports** over default exports
### Component Structure
```typescript
// Copyright header
// ...
import { ... } from '...';
interface YourComponentProps {
  // Props definition
}
export function YourComponent({ prop1, prop2 }: YourComponentProps): ReactElement {
  // Component implementation
}
```
### File Naming
- Components: `PascalCase.tsx`
- Types: `kebab-case-types.ts`
- Utilities: `kebab-case.ts`
- Tests: `*.test.ts` or `*.test.tsx`
## Pull Request Process
1. **Fork** the Perses repository
2. **Create feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Write tests for new functionality
   - Update documentation
   - Follow code style guidelines
4. **Test your changes**
   ```bash
   npm test
   npm run type-check
   ```
5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add support for new SQL driver"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create Pull Request** to `perses/perses` main branch
### Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks
## Project Structure
```
sql/
├── src/
│   ├── datasources/sql-datasource/     # Datasource plugin
│   ├── queries/sql-time-series-query/  # Query plugin
│   ├── explore/                        # Explore plugin
│   └── model/                          # Utilities
├── schemas/                            # CUE validation schemas
├── test-data/                          # Sample data for testing
├── __mocks__/                          # Jest mocks
├── package.json                        # Plugin configuration
├── rsbuild.config.ts                   # Module Federation config
├── jest.config.ts                      # Test configuration
└── Makefile                            # Database management
```
## Debugging
### Backend Logs
```bash
# Start backend with debug logging
./bin/perses --config ./dev/config.yaml --log.level=debug
```
### Plugin Logs
```bash
# Plugin automatically shows build output
percli plugin start .
```
### Browser DevTools
- F12 to open DevTools
- Check Console for errors
- Check the Network tab for API calls
## Common Issues
### Plugin Not Loading
- Check backend is running
- Check plugin server is running (`percli plugin start .`)
- Check browser console for errors
- Verify Module Federation configuration
### Database Connection Errors
- Check database is running (`docker ps`)
- Verify connection settings in datasource config
- Check backend logs for detailed error messages
### TypeScript Errors
- Run `npm run type-check`
- Check imports are correct
- Ensure types are defined
## Questions?
- **Issues**: Open an issue in the Perses repository
- **Discussions**: Join Perses community discussions
- **Documentation**: Check Perses documentation
## License
By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
