#!/bin/bash
set -e

echo "Initializing InfluxDB V1 with test data..."

# Create database
influx -execute "CREATE DATABASE testdb"

# Create retention policy
influx -execute "CREATE RETENTION POLICY \"30days\" ON \"testdb\" DURATION 30d REPLICATION 1 DEFAULT"

# Create measurement with sample data
influx -execute "
INSERT INTO testdb cpu,host=server01,region=us-west value=0.64 1434067467000000000
INSERT INTO testdb cpu,host=server01,region=us-west value=0.60 1434067468000000000
INSERT INTO testdb cpu,host=server02,region=us-west value=0.50 1434067469000000000
INSERT INTO testdb cpu,host=server03,region=us-east value=0.75 1434067470000000000
"

# Create memory measurement
influx -execute "
INSERT INTO testdb memory,host=server01,region=us-west value=1024 1434067467000000000
INSERT INTO testdb memory,host=server01,region=us-west value=2048 1434067468000000000
INSERT INTO testdb memory,host=server02,region=us-west value=1536 1434067469000000000
INSERT INTO testdb memory,host=server03,region=us-east value=2560 1434067470000000000
"

# Create disk measurement
influx -execute "
INSERT INTO testdb disk,host=server01,region=us-west,device=sda value=100 1434067467000000000
INSERT INTO testdb disk,host=server01,region=us-west,device=sdb value=200 1434067468000000000
INSERT INTO testdb disk,host=server02,region=us-west,device=sda value=150 1434067469000000000
INSERT INTO testdb disk,host=server03,region=us-east,device=sda value=250 1434067470000000000
"

# Create network measurement
influx -execute "
INSERT INTO testdb network,host=server01,region=us-west,interface=eth0 bytes_in=1000,bytes_out=2000 1434067467000000000
INSERT INTO testdb network,host=server01,region=us-west,interface=eth1 bytes_in=1500,bytes_out=2500 1434067468000000000
INSERT INTO testdb network,host=server02,region=us-west,interface=eth0 bytes_in=800,bytes_out=1600 1434067469000000000
INSERT INTO testdb network,host=server03,region=us-east,interface=eth0 bytes_in=1200,bytes_out=2400 1434067470000000000
"

# Create temperature measurement (for time-series demo)
influx -execute "
INSERT INTO testdb temperature,host=server01,room=rack01 celsius=22.5 1434067467000000000
INSERT INTO testdb temperature,host=server01,room=rack01 celsius=22.6 1434067468000000000
INSERT INTO testdb temperature,host=server02,room=rack02 celsius=23.0 1434067469000000000
INSERT INTO testdb temperature,host=server03,room=rack01 celsius=21.8 1434067470000000000
INSERT INTO testdb temperature,host=server01,room=rack01 celsius=22.7 1434067471000000000
INSERT INTO testdb temperature,host=server02,room=rack02 celsius=23.1 1434067472000000000
"

echo "InfluxDB V1 initialization complete!"

