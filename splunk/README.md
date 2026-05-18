# Splunk Plugin for Perses

## Overview

The Splunk plugin enables Perses to connect to Splunk instances and query data using Splunk Processing Language (SPL). It supports both time series visualizations and log queries.

## Features

- **Splunk Datasource**: Connect to Splunk Enterprise or Splunk Cloud instances
- **Time Series Queries**: Execute SPL queries for time series data visualization
- **Log Queries**: Retrieve and display log data from Splunk
- **Variable Support**: Use Perses variables in your SPL queries
- **Flexible Authentication**: Support for direct URL or proxy-based connections

## SPL Query Examples

### Time Series Examples

```spl
# Count events over time
search index=main | timechart count

# Average response time by service
search index=web | timechart avg(response_time) by service

# Error rate over time
search index=main error | timechart count
```

### Log Query Examples

```spl
# Recent errors
search index=main error | head 100

# Specific application logs
search index=app sourcetype=application:log level=ERROR

# Search with filters
search index=main host=server01 status=500
```

## API Endpoints

The plugin uses the following Splunk REST API endpoints:

- `/services/search/jobs` - Create search jobs
- `/services/search/jobs/{sid}` - Get job status
- `/services/search/jobs/{sid}/results` - Get search results
- `/services/search/jobs/{sid}/events` - Get search events
- `/services/search/jobs/export` - Export search results
- `/services/data/indexes` - Get index information

## Authentication

Splunk authentication can be configured through:

- HTTP headers (Authorization token)
- Proxy settings with credentials
- Direct URL with embedded credentials (not recommended for production)
