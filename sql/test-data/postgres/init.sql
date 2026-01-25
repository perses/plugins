-- PostgreSQL initialization script for SQL Plugin testing

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create system metrics table (IoT/Monitoring use case)
CREATE TABLE system_metrics (
    timestamp TIMESTAMPTZ NOT NULL,
    host VARCHAR(100) NOT NULL,
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('system_metrics', 'timestamp');

-- Create sensor readings table
CREATE TABLE sensor_readings (
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(7,2),
    location VARCHAR(100)
);

SELECT create_hypertable('sensor_readings', 'timestamp');

-- Create HTTP request logs table
CREATE TABLE http_requests (
    timestamp TIMESTAMPTZ NOT NULL,
    server_name VARCHAR(100) NOT NULL,
    method VARCHAR(10),
    path VARCHAR(500),
    status_code INT,
    response_time_ms INT,
    bytes_sent BIGINT
);

SELECT create_hypertable('http_requests', 'timestamp');

-- Create business transactions table
CREATE TABLE transactions (
    created_at TIMESTAMPTZ NOT NULL,
    transaction_id UUID NOT NULL,
    category VARCHAR(50),
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(20)
);

SELECT create_hypertable('transactions', 'created_at');

-- Create indexes for better query performance
CREATE INDEX idx_system_metrics_host ON system_metrics(host, timestamp DESC);
CREATE INDEX idx_sensor_readings_sensor ON sensor_readings(sensor_id, timestamp DESC);
CREATE INDEX idx_http_requests_server ON http_requests(server_name, timestamp DESC);
CREATE INDEX idx_transactions_category ON transactions(category, created_at DESC);

-- Create continuous aggregate for system metrics (1-hour buckets)
CREATE MATERIALIZED VIEW system_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    host,
    AVG(cpu_percent) as avg_cpu,
    MAX(cpu_percent) as max_cpu,
    MIN(cpu_percent) as min_cpu,
    AVG(memory_percent) as avg_memory,
    MAX(memory_percent) as max_memory
FROM system_metrics
GROUP BY bucket, host
WITH NO DATA;

SELECT add_continuous_aggregate_policy('system_metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

COMMENT ON TABLE system_metrics IS 'System monitoring metrics for CPU, memory, disk, and network';
COMMENT ON TABLE sensor_readings IS 'IoT sensor data for temperature, humidity, and pressure';
COMMENT ON TABLE http_requests IS 'HTTP server request logs';
COMMENT ON TABLE transactions IS 'Business transaction data';
