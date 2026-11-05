# InfluxDB Plugin Test Data Setup

This directory contains tools to set up a complete InfluxDB testing environment for the Perses InfluxDB plugin.

## Contents

- **generate-influxdb-testdata.py** - Python script to generate realistic test data using InfluxDB HTTP API
- **start-influxdb-testenv.sh** - Shell script to start InfluxDB containers
- **docker-compose.influxdb-test.yml** - Docker Compose configuration for InfluxDB V1 and V3
- **influxdb-v1/influxdb-v1-init.sh** - Initialization script for InfluxDB V1
- **influxdb-v3/influxdb-v3-init.sh** - Initialization script for InfluxDB V3

## Quick Start

### 1. Start InfluxDB Services

```bash
./start-influxdb-testenv.sh
```

This will:
- Start InfluxDB V1 (port 8086)
- Start InfluxDB V3 (port 8087)
- Create test databases
- Wait for services to be healthy

### 2. Generate Test Data

```bash
python3 generate-influxdb-testdata.py
```

This generates realistic time-series data:
- **CPU metrics** - 4 hosts × 4 cores × 120 minutes
- **Memory metrics** - 4 hosts × 120 minutes
- **Disk metrics** - 4 hosts × 3 devices × 120 minutes
- **Network metrics** - 4 hosts × 2 interfaces × 120 minutes
- **Temperature metrics** - 4 hosts × 120 minutes

Total: ~50,000 data points covering the last 2 hours

### 3. Configure Perses

Create a Global Datasource in Perses:

```yaml
kind: GlobalDatasource
metadata:
  name: influxdb-v1
spec:
  default: false
  plugin:
    kind: InfluxDBDatasource
    spec:
      version: v1
      directUrl: http://localhost:8086
      database: testdb
```

### 4. Create Queries

Example InfluxQL queries:

```sql
-- Get CPU usage for a specific host
SELECT * FROM cpu WHERE host='server01' AND time > now() - 1h

-- Get average memory usage per host
SELECT mean(value) as avg_memory FROM memory WHERE time > now() - 1h GROUP BY host

-- Get disk usage with region filtering
SELECT * FROM disk WHERE region='us-west' AND time > now() - 1h

-- Get network metrics
SELECT bytes_in, bytes_out FROM network WHERE host='server02' AND time > now() - 1h
```

## Architecture

### InfluxDB V1
- **Host**: localhost
- **Port**: 8086
- **Database**: testdb
- **Authentication**: None (default)
- **HTTP Endpoint**: `/query`

### InfluxDB V3
- **Host**: localhost
- **Port**: 8087
- **Organization**: testorg
- **Bucket**: testbucket
- **Token**: test-token-12345
- **HTTP Endpoint**: `/api/v2/query`

## Data Generation Details

The `generate-influxdb-testdata.py` script:

1. **Uses HTTP API**: Sends data via POST to `/write?db=database` endpoint
2. **Line Protocol Format**: Uses InfluxDB line protocol for efficiency
3. **Batch Insertion**: Inserts 1000 lines per HTTP request
4. **Realistic Data**:
   - CPU: 20-50% with occasional spikes
   - Memory: 4-8 GB with garbage collection patterns
   - Disk: 1-10 TB with slow growth
   - Network: Variable bytes in/out with traffic spikes
   - Temperature: 20-25°C with natural drift

### Measurements

**cpu**
- Tags: host (server01-04), region (us-west, us-east, eu-west), core (0-3)
- Fields: value (0-100%)

**memory**
- Tags: host (server01-04), region
- Fields: value (1024-8192 MB)

**disk**
- Tags: host, region, device (sda, sdb, sdc)
- Fields: value (0-10000 GB)

**network**
- Tags: host, region, interface (eth0, eth1)
- Fields: bytes_in, bytes_out

**temperature**
- Tags: host, room (rack01, rack02, rack03)
- Fields: celsius (15-35°C)

## Useful Commands

### View Available Measurements
```bash
curl 'http://localhost:8086/query?db=testdb&q=SHOW+MEASUREMENTS'
```

### Query Data via HTTP
```bash
curl 'http://localhost:8086/query?db=testdb&q=SELECT+*+FROM+cpu+WHERE+host=%27server01%27+LIMIT+10'
```

### Insert Custom Data
```bash
curl -X POST 'http://localhost:8086/write?db=testdb' \
  --data-binary 'cpu,host=myhost,region=us-west,core=0 value=45.5 1645000000000000000'
```

### View Container Logs
```bash
docker-compose -f docker-compose.influxdb-test.yml logs -f influxdb-v1
```

### Stop Services
```bash
docker-compose -f docker-compose.influxdb-test.yml down
```

### Remove All Data and Start Fresh
```bash
docker-compose -f docker-compose.influxdb-test.yml down -v
./start-influxdb-testenv.sh
python3 generate-influxdb-testdata.py
```

## Requirements

- Docker and Docker Compose
- Python 3.6+
- curl (optional, for manual testing)

## Troubleshooting

### Script Fails to Connect

If you get "Error connecting to InfluxDB", make sure:
1. InfluxDB is running: `docker-compose ps`
2. Port 8086 is accessible: `curl http://localhost:8086/ping`
3. Give the container time to start (up to 30 seconds)

### No Data Generated

Check that:
1. Database exists: `curl 'http://localhost:8086/query?db=testdb&q=SHOW+DATABASES'`
2. Server is responding to writes: `curl -X POST 'http://localhost:8086/write?db=testdb' --data 'test,host=test value=1'`

### High Memory Usage

If containers use too much memory:
1. Reduce the `minutes` parameter in the script (default: 120)
2. Reduce `batch_size` if insert fails
3. Delete old data and regenerate

## Integration with Perses Development

1. Start InfluxDB test environment:
   ```bash
   cd plugins/influxdb/test-data
   ./start-influxdb-testenv.sh
   ```

2. In another terminal, start Perses:
   ```bash
   npm run dev
   ```

3. Create a Global Datasource pointing to `http://localhost:8086`

4. Test queries and explorer functionality

## Advanced Usage

### Generate More Data

Edit the script to change:
```python
minutes = 120  # Change this to generate more/less data
```

### Custom Metrics

Modify the generation functions:
```python
def generate_custom_metrics(minutes=60):
    """Generate your custom metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)
    
    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)
        # Your metric generation logic
        line = f'your_measurement,tag1=value1 field1=value {timestamp}'
        lines.append(line)
    
    return lines
```

Then add it to `main()`:
```python
all_lines.extend(generate_custom_metrics(minutes))
```

## Notes

- The HTTP API approach is more reliable than CLI commands
- Data is inserted in batches for better performance
- Each run generates new timestamps, so you can run the script multiple times to add more data
- The test data uses realistic patterns (CPU spikes, memory GC, disk growth)

For more information on InfluxDB HTTP API:
- [InfluxDB V1 Write API](https://docs.influxdata.com/influxdb/v1.8/guides/write_data/)
- [InfluxDB Line Protocol](https://docs.influxdata.com/influxdb/v1.8/write_protocols/line_protocol/)

