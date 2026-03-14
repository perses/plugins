-- MySQL sample data generation

-- Procedure to generate sample data
DELIMITER $$

CREATE PROCEDURE generate_sample_data()
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE max_iterations INT DEFAULT 10000;
    DECLARE current_timestamp DATETIME(3) DEFAULT NOW(3);

    -- Generate system metrics (last 7 days, 1-minute intervals, sampled)
    WHILE i < max_iterations DO
        SET current_timestamp = DATE_SUB(NOW(3), INTERVAL FLOOR(RAND() * 10080) MINUTE);

        INSERT INTO system_metrics (timestamp, host, cpu_percent, memory_percent, disk_usage_percent, network_rx_bytes, network_tx_bytes)
        VALUES (
            current_timestamp,
            CONCAT('server-', FLOOR(1 + RAND() * 5)),
            20 + (RAND() * 60),
            30 + (RAND() * 50),
            40 + (RAND() * 40),
            FLOOR(RAND() * 1000000000),
            FLOOR(RAND() * 1000000000)
        );

        SET i = i + 1;
    END WHILE;

    -- Generate sensor readings
    SET i = 0;
    WHILE i < 5000 DO
        SET current_timestamp = DATE_SUB(NOW(3), INTERVAL FLOOR(RAND() * 10080) MINUTE);

        INSERT INTO sensor_readings (timestamp, sensor_id, sensor_type, temperature, humidity, pressure, location)
        VALUES (
            current_timestamp,
            CONCAT('sensor-', LPAD(FLOOR(1 + RAND() * 10), 3, '0')),
            ELT(FLOOR(1 + RAND() * 3), 'temperature', 'humidity', 'pressure'),
            18 + (RAND() * 12),
            40 + (RAND() * 40),
            990 + (RAND() * 30),
            ELT(FLOOR(1 + RAND() * 4), 'Building A', 'Building B', 'Building C', 'Building D')
        );

        SET i = i + 1;
    END WHILE;

    -- Generate HTTP requests
    SET i = 0;
    WHILE i < 20000 DO
        SET current_timestamp = DATE_SUB(NOW(3), INTERVAL FLOOR(RAND() * 10080) MINUTE);

        INSERT INTO http_requests (timestamp, server_name, method, path, status_code, response_time_ms, bytes_sent)
        VALUES (
            current_timestamp,
            CONCAT('web-', FLOOR(1 + RAND() * 3)),
            ELT(FLOOR(1 + RAND() * 4), 'GET', 'POST', 'PUT', 'DELETE'),
            CONCAT('/api/v1/resource/', FLOOR(RAND() * 100)),
            IF(RAND() < 0.9, 200, IF(RAND() < 0.95, 404, 500)),
            10 + FLOOR(RAND() * 1000),
            100 + FLOOR(RAND() * 100000)
        );

        SET i = i + 1;
    END WHILE;

    -- Generate transactions
    SET i = 0;
    WHILE i < 5000 DO
        SET current_timestamp = DATE_SUB(NOW(3), INTERVAL FLOOR(RAND() * 10080) MINUTE);

        INSERT INTO transactions (created_at, transaction_id, category, amount, currency, status)
        VALUES (
            current_timestamp,
            UUID(),
            ELT(FLOOR(1 + RAND() * 5), 'electronics', 'clothing', 'food', 'books', 'other'),
            10 + (RAND() * 990),
            'USD',
            IF(RAND() < 0.85, 'completed', IF(RAND() < 0.95, 'pending', 'failed'))
        );

        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

-- Execute the procedure
CALL generate_sample_data();

-- Clean up
DROP PROCEDURE generate_sample_data;

-- Verify data
SELECT 'system_metrics' as table_name, COUNT(*) as row_count FROM system_metrics
UNION ALL
SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
UNION ALL
SELECT 'http_requests', COUNT(*) FROM http_requests
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
