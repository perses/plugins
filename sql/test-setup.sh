#!/bin/bash

# SQL Plugin Quick Test Script
# This script sets up and runs tests for the SQL plugin

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SQL Plugin Testing Quick Start      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo -e "${RED}❌ docker-compose not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} docker-compose is available"
}

# Function to start databases
start_databases() {
    echo ""
    echo -e "${BLUE}Starting test databases...${NC}"
    $DOCKER_COMPOSE -f docker-compose.test.yaml up -d

    echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
    sleep 15

    # Check health
    if $DOCKER_COMPOSE -f docker-compose.test.yaml ps | grep -q "unhealthy"; then
        echo -e "${RED}❌ Some databases failed to start healthy${NC}"
        $DOCKER_COMPOSE -f docker-compose.test.yaml ps
        exit 1
    fi

    echo -e "${GREEN}✓${NC} All databases are running"
}

# Function to verify data
verify_data() {
    echo ""
    echo -e "${BLUE}Verifying test data...${NC}"

    # PostgreSQL
    echo -e "${YELLOW}PostgreSQL:${NC}"
    docker exec perses-sql-test-postgres psql -U perses -d perses_test -t -c "\
        SELECT '  ' || table_name || ': ' || row_count::text FROM ( \
            SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics \
            UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings \
            UNION ALL SELECT 'http_requests', COUNT(*) FROM http_requests \
            UNION ALL SELECT 'transactions', COUNT(*) FROM transactions \
        ) t;" 2>/dev/null || echo -e "${RED}  Failed to query PostgreSQL${NC}"

    # MySQL
    echo -e "${YELLOW}MySQL:${NC}"
    docker exec perses-sql-test-mysql mysql -u perses -pperses_test_password perses_test -sN -e "\
        SELECT CONCAT('  ', table_name, ': ', row_count) FROM ( \
            SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics \
            UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings \
            UNION ALL SELECT 'http_requests', COUNT(*) FROM http_requests \
            UNION ALL SELECT 'transactions', COUNT(*) FROM transactions \
        ) t;" 2>/dev/null || echo -e "${RED}  Failed to query MySQL${NC}"

    echo -e "${GREEN}✓${NC} Test data verified"
}

# Function to run tests
run_tests() {
    echo ""
    echo -e "${BLUE}Running unit tests...${NC}"
    npm test 2>/dev/null || {
        echo -e "${YELLOW}Note: Some tests may fail if dependencies are not installed${NC}"
        echo -e "${YELLOW}Run 'npm install' first${NC}"
    }
}

# Function to show info
show_info() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Test Environment Ready! 🎉           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Database Connections:${NC}"
    echo "  PostgreSQL:  localhost:5432"
    echo "    User:      perses"
    echo "    Password:  perses_test_password"
    echo "    Database:  perses_test"
    echo ""
    echo "  MySQL:       localhost:3306"
    echo "    User:      perses"
    echo "    Password:  perses_test_password"
    echo "    Database:  perses_test"
    echo ""
    echo "  MariaDB:     localhost:3307"
    echo "    User:      perses"
    echo "    Password:  perses_test_password"
    echo "    Database:  perses_test"
    echo ""
    echo -e "${BLUE}Web UI:${NC}"
    echo "  Adminer:     http://localhost:8080"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  make test              - Run all tests"
    echo "  make test-watch        - Run tests in watch mode"
    echo "  make verify-all        - Verify all database data"
    echo "  make db-logs           - Show database logs"
    echo "  make db-down           - Stop databases"
    echo "  make db-clean          - Stop and remove databases"
    echo ""
}

# Main execution
main() {
    echo "Checking prerequisites..."
    check_docker
    check_docker_compose

    start_databases
    verify_data

    if [ "$1" != "--skip-tests" ]; then
        run_tests
    fi

    show_info

    echo -e "${GREEN}Setup complete! Start testing! 🚀${NC}"
}

# Parse arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running npm tests"
    echo "  --help, -h      Show this help message"
    echo ""
    exit 0
fi

main "$@"
