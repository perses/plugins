-- MySQL initialization script for SQL Plugin testing

-- Create system metrics table
CREATE TABLE system_metrics (
    timestamp DATETIME(3) NOT NULL,
    host VARCHAR(100) NOT NULL,
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    disk_usage_percent DECIMAL(5,2),
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_host_timestamp (host, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create sensor readings table
CREATE TABLE sensor_readings (
    timestamp DATETIME(3) NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(7,2),
    location VARCHAR(100),
    INDEX idx_timestamp (timestamp),
    INDEX idx_sensor_timestamp (sensor_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create HTTP request logs table
CREATE TABLE http_requests (
    timestamp DATETIME(3) NOT NULL,
    server_name VARCHAR(100) NOT NULL,
    method VARCHAR(10),
    path VARCHAR(500),
    status_code INT,
    response_time_ms INT,
    bytes_sent BIGINT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_server_timestamp (server_name, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create business transactions table
CREATE TABLE transactions (
    created_at DATETIME(3) NOT NULL,
    transaction_id CHAR(36) NOT NULL,
    category VARCHAR(50),
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(20),
    INDEX idx_created_at (created_at),
    INDEX idx_category_created (category, created_at),
    PRIMARY KEY (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
