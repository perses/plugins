# Makefile for SQL Plugin Testing

.PHONY: help test test-watch test-coverage db-up db-down db-restart db-logs db-clean unit-tests integration-tests

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Database Management
db-up: ## Start all test databases
	docker-compose -f docker-compose.test.yaml up -d
	@echo "Waiting for databases to be ready..."
	@sleep 10
	@echo "Databases are ready!"
	@echo ""
	@echo "PostgreSQL: localhost:5432"
	@echo "MySQL:      localhost:3306"
	@echo "MariaDB:    localhost:3307"
	@echo "Adminer UI: http://localhost:8080"

db-down: ## Stop all test databases
	docker-compose -f docker-compose.test.yaml down

db-restart: ## Restart all test databases
	docker-compose -f docker-compose.test.yaml restart

db-logs: ## Show database logs
	docker-compose -f docker-compose.test.yaml logs -f

db-clean: ## Stop and remove all databases and volumes
	docker-compose -f docker-compose.test.yaml down -v
	@echo "All database containers and volumes removed"

db-status: ## Show status of database containers
	docker-compose -f docker-compose.test.yaml ps

# Testing
unit-tests: ## Run unit tests
	npm test -- replace-sql-builtin-variables.test.ts

test: ## Run all tests
	npm test

test-watch: ## Run tests in watch mode
	npm test -- --watch

test-coverage: ## Run tests with coverage report
	npm test -- --coverage

test-verbose: ## Run tests with verbose output
	npm test -- --verbose

# Database Verification
verify-postgres: ## Verify PostgreSQL test data
	docker exec -it perses-sql-test-postgres psql -U perses -d perses_test -c "\
		SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics \
		UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings \
		UNION ALL SELECT 'http_requests', COUNT(*) FROM http_requests \
		UNION ALL SELECT 'transactions', COUNT(*) FROM transactions;"

verify-mysql: ## Verify MySQL test data
	docker exec -it perses-sql-test-mysql mysql -u perses -pperses_test_password perses_test -e "\
		SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics \
		UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings \
		UNION ALL SELECT 'http_requests', COUNT(*) FROM http_requests \
		UNION ALL SELECT 'transactions', COUNT(*) FROM transactions;"

verify-mariadb: ## Verify MariaDB test data
	docker exec -it perses-sql-test-mariadb mysql -u perses -pperses_test_password perses_test -e "\
		SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics \
		UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings \
		UNION ALL SELECT 'http_requests', COUNT(*) FROM http_requests \
		UNION ALL SELECT 'transactions', COUNT(*) FROM transactions;"

verify-all: verify-postgres verify-mysql verify-mariadb ## Verify all databases

# Development
dev-setup: db-up ## Complete development setup
	npm install
	@echo ""
	@echo "✅ Development environment ready!"
	@echo "Run 'make test' to run tests"
	@echo "Run 'make test-watch' for watch mode"

clean-all: db-clean ## Clean everything (databases, node_modules, dist)
	rm -rf node_modules dist

# Quick commands
quick-test: db-up test ## Start databases and run tests

integration: db-up verify-all ## Start databases and verify data
	@echo ""
	@echo "✅ Integration test environment ready!"

# Install dependencies
install: ## Install npm dependencies
	npm install

build: ## Build the plugin
	npm run build

lint: ## Run linter
	npm run lint

type-check: ## Run TypeScript type checking
	npm run type-check

# Complete test workflow
full-test: clean-all install db-up verify-all test test-coverage ## Complete test workflow
	@echo ""
	@echo "✅ Full test workflow completed!"
