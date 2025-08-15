export const queryExample = `-- Time Series Query
SELECT 
  toStartOfMinute(timestamp) as time,
  avg(cpu_usage) as avg_cpu,
  max(memory_usage) as max_memory
FROM system_metrics 
WHERE timestamp BETWEEN '{start}' AND '{end}'
GROUP BY time ORDER BY time
-- Logs Query  
SELECT 
  Timestamp as log_time,
  Body,
  ServiceName,
  ResourceAttributes,
  SeverityNumber,
  SeverityText
FROM application_logs 
WHERE timestamp >= '{start}' 
ORDER BY time DESC LIMIT 1000`;
