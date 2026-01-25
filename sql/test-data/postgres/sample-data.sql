-- PostgreSQL sample data generation for testing

-- Generate system metrics data for the last 7 days
INSERT INTO system_metrics (timestamp, host, cpu_percent, memory_percent, disk_usage_percent, network_rx_bytes, network_tx_bytes)
SELECT
    timestamp,
    'server-' || (n % 5 + 1) as host,
    20 + (random() * 60)::DECIMAL(5,2) as cpu_percent,
    30 + (random() * 50)::DECIMAL(5,2) as memory_percent,
    40 + (random() * 40)::DECIMAL(5,2) as disk_usage_percent,
    (random() * 1000000000)::BIGINT as network_rx_bytes,
    (random() * 1000000000)::BIGINT as network_tx_bytes
FROM
    generate_series(
        NOW() - INTERVAL '7 days',
        NOW(),
        INTERVAL '1 minute'
    ) AS timestamp,
    generate_series(1, 100) AS n
WHERE (n % 100) = 0;  -- 1% sampling to avoid too much data

-- Generate sensor readings data
INSERT INTO sensor_readings (timestamp, sensor_id, sensor_type, temperature, humidity, pressure, location)
SELECT
    timestamp,
    'sensor-' || LPAD((n % 10 + 1)::TEXT, 3, '0') as sensor_id,
    CASE (n % 3)
        WHEN 0 THEN 'temperature'
        WHEN 1 THEN 'humidity'
        ELSE 'pressure'
    END as sensor_type,
    (18 + random() * 12)::DECIMAL(5,2) as temperature,
    (40 + random() * 40)::DECIMAL(5,2) as humidity,
    (990 + random() * 30)::DECIMAL(7,2) as pressure,
    CASE (n % 4)
        WHEN 0 THEN 'Building A'
        WHEN 1 THEN 'Building B'
        WHEN 2 THEN 'Building C'
        ELSE 'Building D'
    END as location
FROM
    generate_series(
        NOW() - INTERVAL '7 days',
        NOW(),
        INTERVAL '5 minutes'
    ) AS timestamp,
    generate_series(1, 50) AS n
WHERE (n % 50) = 0;

-- Generate HTTP request logs
INSERT INTO http_requests (timestamp, server_name, method, path, status_code, response_time_ms, bytes_sent)
SELECT
    timestamp,
    'web-' || (n % 3 + 1) as server_name,
    CASE (n % 5)
        WHEN 0 THEN 'GET'
        WHEN 1 THEN 'POST'
        WHEN 2 THEN 'PUT'
        WHEN 3 THEN 'DELETE'
        ELSE 'GET'
    END as method,
    '/api/v1/resource/' || (n % 100) as path,
    CASE
        WHEN random() < 0.9 THEN 200
        WHEN random() < 0.95 THEN 404
        ELSE 500
    END as status_code,
    (10 + random() * 1000)::INT as response_time_ms,
    (100 + random() * 100000)::BIGINT as bytes_sent
FROM
    generate_series(
        NOW() - INTERVAL '7 days',
        NOW(),
        INTERVAL '10 seconds'
    ) AS timestamp,
    generate_series(1, 10) AS n
WHERE (n % 10) = 0;

-- Generate transaction data
INSERT INTO transactions (created_at, transaction_id, category, amount, currency, status)
SELECT
    timestamp as created_at,
    gen_random_uuid() as transaction_id,
    CASE (n % 5)
        WHEN 0 THEN 'electronics'
        WHEN 1 THEN 'clothing'
        WHEN 2 THEN 'food'
        WHEN 3 THEN 'books'
        ELSE 'other'
    END as category,
    (10 + random() * 990)::DECIMAL(10,2) as amount,
    'USD' as currency,
    CASE
        WHEN random() < 0.85 THEN 'completed'
        WHEN random() < 0.95 THEN 'pending'
        ELSE 'failed'
    END as status
FROM
    generate_series(
        NOW() - INTERVAL '7 days',
        NOW(),
        INTERVAL '1 minute'
    ) AS timestamp,
    generate_series(1, 20) AS n
WHERE (n % 20) = 0;

-- Refresh continuous aggregate
CALL refresh_continuous_aggregate('system_metrics_hourly', NULL, NULL);

-- Verify data
SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics
UNION ALL
SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL
SELECT 'http_requests', COUNT(*) FROM http_requests
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
