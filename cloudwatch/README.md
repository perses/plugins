# CloudWatch Plugin for Perses

## Overview

The CloudWatch plugin queries [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) metrics through the HTTP proxy of
the Perses server, which signs the requests with the SigV4 configuration of a secret. The browser never receives AWS
credentials.

## Features

- **CloudWatch Datasource**: an HTTP proxy to the CloudWatch API of a region, with a secret holding the SigV4
  configuration.
- **CloudWatch Time Series Query**: metrics and metric math expressions sent in a single `GetMetricData` request, with
  metric discovery in the editor. The period is adapted to the time range and to the panel.
- **CloudWatch Dimension Values Variable**: the values of a dimension in a namespace, for example every `InstanceId`.
- **Variable Support**: dashboard variables can be used in the namespaces, metric names, dimensions, expressions and
  legends.

## Documentation

See the [documentation of the plugin](../docs/cloudwatch/README.md), its [data model](../docs/cloudwatch/model.md) and
its [Dashboard-as-Code Go lib](../docs/cloudwatch/go-sdk/datasource.md).
