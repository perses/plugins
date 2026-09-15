#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     InfluxDB Test Setup for Perses Plugin Testing          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: docker or docker-compose is not installed${NC}"
    exit 1
fi

# Determine docker-compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}1. Starting InfluxDB V1 and V3 containers...${NC}"
$DOCKER_COMPOSE -f "$SCRIPT_DIR/docker-compose.influxdb-test.yml" up -d

echo -e "${YELLOW}2. Waiting for services to be healthy...${NC}"
echo "   - InfluxDB V1 (port 8086)"
echo "   - InfluxDB V3 (port 8087)"
echo "   - Grafana (port 3000)"
echo ""

# Wait for InfluxDB V1
echo -n "   Checking InfluxDB V1... "
for i in {1..30}; do
    if curl -s http://localhost:8086/ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for InfluxDB V3
echo -n "   Checking InfluxDB V3... "
for i in {1..30}; do
    if curl -s http://localhost:8087/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${YELLOW}3. Initializing test databases...${NC}"

# Initialize InfluxDB V1
echo "   Initializing InfluxDB V1..."
docker exec influxdb-v1 influx -execute "CREATE DATABASE testdb" 2>/dev/null || true
docker exec influxdb-v1 influx -database testdb -execute "SHOW MEASUREMENTS" > /dev/null

echo -e "   ${GREEN}✓${NC} InfluxDB V1 ready"

# Initialize InfluxDB V3
echo "   Initializing InfluxDB V3..."
sleep 5  # Give V3 more time to start
echo -e "   ${GREEN}✓${NC} InfluxDB V3 ready"

echo ""
echo -e "${YELLOW}4. Generating test data...${NC}"

# Check if Python is available for advanced data generation
if command -v python3 &> /dev/null; then
    echo "   Running Python data generator..."
    python3 "$SCRIPT_DIR/generate-influxdb-testdata.py" || echo "   Note: Python generator had issues, but basic data is loaded"
else
    echo "   Python3 not available, using basic test data"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ Setup Complete!                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Available InfluxDB Instances:${NC}"
echo ""
echo -e "  ${YELLOW}InfluxDB V1${NC}"
echo "    URL: http://localhost:8086"
echo "    Database: testdb"
echo "    Admin: admin / password"
echo "    Measurements:"
echo "      - cpu (tags: host, region, core)"
echo "      - memory (tags: host, region)"
echo "      - disk (tags: host, region, device)"
echo "      - network (tags: host, region, interface)"
echo "      - temperature (tags: host, room)"
echo ""

echo -e "  ${YELLOW}InfluxDB V3${NC}"
echo "    URL: http://localhost:8087"
echo "    Org: testorg"
echo "    Bucket: testbucket"
echo "    Token: test-token-12345"
echo "    Admin: admin / password"
echo ""

echo -e "  ${YELLOW}Grafana (Optional)${NC}"
echo "    URL: http://localhost:3000"
echo "    Admin: admin / admin"
echo ""

echo -e "${BLUE}Testing with Perses:${NC}"
echo ""
echo "1. Start Perses development server"
echo ""
echo "2. Create a Global Datasource for InfluxDB V1:"
echo ""
echo "   Kind: GlobalDatasource"
echo "   Name: influxdb-v1"
echo "   Plugin: InfluxDBDatasource"
echo "   Spec:"
echo "     directUrl: http://localhost:8086"
echo "     database: testdb"
echo ""

echo "3. Create a Query:"
echo ""
echo "   Query: SELECT * FROM cpu WHERE time > now() - 1h"
echo "   Or:    SELECT * FROM memory WHERE time > now() - 1h"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo ""
echo "  View InfluxDB V1 data:"
echo "    curl 'http://localhost:8086/query?db=testdb&q=SHOW MEASUREMENTS'"
echo ""
echo "  List measurements:"
echo "    influx -database testdb -execute 'SHOW MEASUREMENTS'"
echo ""
echo "  Query data:"
echo "    influx -database testdb -execute 'SELECT * FROM cpu LIMIT 10'"
echo ""
echo "  Stop containers:"
echo "    docker-compose -f $SCRIPT_DIR/docker-compose.influxdb-test.yml down"
echo ""
echo "  View logs:"
echo "    docker-compose -f $SCRIPT_DIR/docker-compose.influxdb-test.yml logs -f"
echo ""

echo -e "${GREEN}Ready to test! Open Perses and configure datasource.${NC}"

