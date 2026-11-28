#!/bin/bash
set -e

echo "Initializing InfluxDB V3 with test data..."

# Note: For InfluxDB V3, we'll use the newer API approach
# V3 uses different data structure but compatible query API

# Export token for influx CLI
export INFLUX_TOKEN="test-token-12345"
export INFLUX_ORG="testorg"
export INFLUX_BUCKET="testbucket"
export INFLUX_URL="http://localhost:8087"

# Wait for InfluxDB to be ready
echo "Waiting for InfluxDB V3 to be ready..."
until curl -s -H "Authorization: Token $INFLUX_TOKEN" "$INFLUX_URL/health" > /dev/null 2>&1; do
  echo "InfluxDB V3 not ready yet, waiting..."
  sleep 5
done

echo "InfluxDB V3 is ready!"

# Create bucket if not exists (usually created during init)
# For now we use the default bucket created by environment variables

# Insert test data using line protocol
# CPU metrics
curl -X POST "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary @- << 'EOF'
cpu,host=server01,region=us-west,core=0 value=45.5 1434067467000000000
cpu,host=server01,region=us-west,core=1 value=42.1 1434067468000000000
cpu,host=server02,region=us-west,core=0 value=38.9 1434067469000000000
cpu,host=server03,region=us-east,core=0 value=55.2 1434067470000000000
EOF

# Memory metrics
curl -X POST "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary @- << 'EOF'
memory,host=server01,region=us-west value=5120 1434067467000000000
memory,host=server01,region=us-west value=5242 1434067468000000000
memory,host=server02,region=us-west value=4864 1434067469000000000
memory,host=server03,region=us-east value=6144 1434067470000000000
EOF

# Disk metrics
curl -X POST "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary @- << 'EOF'
disk,host=server01,region=us-west,device=sda value=3500 1434067467000000000
disk,host=server01,region=us-west,device=sdb value=2800 1434067468000000000
disk,host=server02,region=us-west,device=sda value=4200 1434067469000000000
disk,host=server03,region=us-east,device=sda value=5600 1434067470000000000
EOF

# Network metrics
curl -X POST "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary @- << 'EOF'
network,host=server01,region=us-west,interface=eth0 bytes_in=1250,bytes_out=2150 1434067467000000000
network,host=server01,region=us-west,interface=eth1 bytes_in=1875,bytes_out=3125 1434067468000000000
network,host=server02,region=us-west,interface=eth0 bytes_in=1000,bytes_out=2000 1434067469000000000
network,host=server03,region=us-east,interface=eth0 bytes_in=1500,bytes_out=3000 1434067470000000000
EOF

# Temperature metrics
curl -X POST "$INFLUX_URL/api/v2/write?org=$INFLUX_ORG&bucket=$INFLUX_BUCKET" \
  -H "Authorization: Token $INFLUX_TOKEN" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary @- << 'EOF'
temperature,host=server01,room=rack01 celsius=22.5 1434067467000000000
temperature,host=server01,room=rack01 celsius=22.6 1434067468000000000
temperature,host=server02,room=rack02 celsius=23.2 1434067469000000000
temperature,host=server03,room=rack01 celsius=21.9 1434067470000000000
EOF

echo "InfluxDB V3 initialization complete!"

