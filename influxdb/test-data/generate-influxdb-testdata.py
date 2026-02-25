#!/usr/bin/env python3
"""
Generate realistic time-series test data for InfluxDB V1
This script creates sample metrics that are useful for testing the Perses InfluxDB plugin
Uses InfluxDB HTTP API instead of CLI
"""

import time
import math
import random
from datetime import datetime, timedelta
import urllib.request
import urllib.error
import sys

def insert_data(host, port, database, lines):
    """Insert data into InfluxDB V1 using HTTP line protocol"""
    url = f"http://{host}:{port}/write?db={database}"

    # Prepare line protocol data
    data = '\n'.join(lines).encode('utf-8')

    try:
        request = urllib.request.Request(url, data=data, method='POST')
        request.add_header('Content-Type', 'text/plain')

        with urllib.request.urlopen(request) as response:
            status = response.status
            if status != 204:
                print(f"Warning: Expected 204 status, got {status}", file=sys.stderr)

    except urllib.error.HTTPError as e:
        print(f"Error inserting data: HTTP {e.code}", file=sys.stderr)
        print(f"Response: {e.read().decode('utf-8')}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Error connecting to InfluxDB: {e.reason}", file=sys.stderr)
        sys.exit(1)

def generate_cpu_metrics(minutes=60):
    """Generate realistic CPU usage metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)

    hosts = ["server01", "server02", "server03", "server04"]
    regions = ["us-west", "us-east", "eu-west"]

    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)

        for host in hosts:
            for core in range(4):
                # Simulate CPU with natural variations
                base_load = random.uniform(20, 50)
                noise = random.gauss(0, 5)
                peak = 30 if random.random() < 0.1 else 0  # 10% chance of peak

                cpu_value = base_load + noise + peak
                cpu_value = max(0, min(100, cpu_value))  # Clamp between 0-100

                region = regions[hash(host) % len(regions)]
                line = f'cpu,host={host},region={region},core={core} value={cpu_value:.2f} {timestamp}'
                lines.append(line)

    return lines

def generate_memory_metrics(minutes=60):
    """Generate realistic memory usage metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)

    hosts = ["server01", "server02", "server03", "server04"]
    regions = ["us-west", "us-east", "eu-west"]

    # Initialize baseline memory per host
    memory_state = {host: random.uniform(4000, 6000) for host in hosts}

    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)

        for host in hosts:
            # Memory tends to grow slowly then drop (garbage collection)
            if random.random() < 0.1:  # 10% chance of GC
                memory_state[host] -= random.uniform(500, 2000)
            else:
                memory_state[host] += random.uniform(0, 200)

            memory_state[host] = max(1024, min(8192, memory_state[host]))

            region = regions[hash(host) % len(regions)]
            line = f'memory,host={host},region={region} value={memory_state[host]:.0f} {timestamp}'
            lines.append(line)

    return lines

def generate_disk_metrics(minutes=60):
    """Generate realistic disk usage metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)

    hosts = ["server01", "server02", "server03", "server04"]
    devices = ["sda", "sdb", "sdc"]
    regions = ["us-west", "us-east", "eu-west"]

    disk_state = {}
    for host in hosts:
        for device in devices:
            disk_state[f"{host}_{device}"] = random.uniform(1000, 5000)

    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)

        for host in hosts:
            for device in devices:
                key = f"{host}_{device}"
                # Disk usage slowly increases
                disk_state[key] += random.uniform(0, 100)
                disk_state[key] = max(0, min(10000, disk_state[key]))

                region = regions[hash(host) % len(regions)]
                line = f'disk,host={host},region={region},device={device} value={disk_state[key]:.0f} {timestamp}'
                lines.append(line)

    return lines

def generate_network_metrics(minutes=60):
    """Generate realistic network metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)

    hosts = ["server01", "server02", "server03", "server04"]
    interfaces = ["eth0", "eth1"]
    regions = ["us-west", "us-east", "eu-west"]

    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)

        for host in hosts:
            for interface in interfaces:
                # Network traffic patterns
                base_in = random.uniform(100, 1000)
                base_out = random.uniform(50, 500)

                # Occasional spikes
                if random.random() < 0.05:
                    base_in *= random.uniform(2, 5)
                    base_out *= random.uniform(2, 5)

                region = regions[hash(host) % len(regions)]
                line = f'network,host={host},region={region},interface={interface} bytes_in={base_in:.0f},bytes_out={base_out:.0f} {timestamp}'
                lines.append(line)

    return lines

def generate_temperature_metrics(minutes=60):
    """Generate realistic temperature metrics"""
    lines = []
    base_time = datetime.now() - timedelta(minutes=minutes)

    hosts = ["server01", "server02", "server03", "server04"]
    rooms = ["rack01", "rack02", "rack03"]

    temp_state = {}
    for host in hosts:
        temp_state[host] = random.uniform(20, 25)

    for minute in range(minutes):
        timestamp = int((base_time + timedelta(minutes=minute)).timestamp() * 1e9)

        for host in hosts:
            # Temperature drifts slowly
            temp_state[host] += random.gauss(0, 0.2)
            temp_state[host] = max(15, min(35, temp_state[host]))

            room = rooms[hash(host) % len(rooms)]
            line = f'temperature,host={host},room={room} celsius={temp_state[host]:.2f} {timestamp}'
            lines.append(line)

    return lines

def main():
    host = "localhost"
    port = 8086
    database = "testdb"
    minutes = 120  # Generate 2 hours of data
    batch_size = 1000  # Insert 1000 lines per request

    print("Generating InfluxDB V1 test data...")
    print(f"Host: {host}:{port}, Database: {database}")
    print(f"Time window: Last {minutes} minutes")
    print(f"Batch size: {batch_size} lines per request")
    print()

    all_lines = []

    print("Generating CPU metrics...", end=" ", flush=True)
    cpu_lines = generate_cpu_metrics(minutes)
    all_lines.extend(cpu_lines)
    print(f"✓ ({len(cpu_lines)} points)")

    print("Generating memory metrics...", end=" ", flush=True)
    memory_lines = generate_memory_metrics(minutes)
    all_lines.extend(memory_lines)
    print(f"✓ ({len(memory_lines)} points)")

    print("Generating disk metrics...", end=" ", flush=True)
    disk_lines = generate_disk_metrics(minutes)
    all_lines.extend(disk_lines)
    print(f"✓ ({len(disk_lines)} points)")

    print("Generating network metrics...", end=" ", flush=True)
    network_lines = generate_network_metrics(minutes)
    all_lines.extend(network_lines)
    print(f"✓ ({len(network_lines)} points)")

    print("Generating temperature metrics...", end=" ", flush=True)
    temp_lines = generate_temperature_metrics(minutes)
    all_lines.extend(temp_lines)
    print(f"✓ ({len(temp_lines)} points)")

    print()
    print(f"Total data points: {len(all_lines)}")
    print()

    # Insert data in batches
    print("Inserting data into InfluxDB...")
    total_batches = (len(all_lines) + batch_size - 1) // batch_size

    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(all_lines))
        batch_lines = all_lines[start_idx:end_idx]

        print(f"  Batch {batch_num + 1}/{total_batches} ({len(batch_lines)} lines)...", end=" ", flush=True)
        try:
            insert_data(host, port, database, batch_lines)
            print("✓")
        except SystemExit:
            print("✗")
            raise

    print()
    print("Test data generation complete!")
    print()
    print("Available measurements:")
    print("  - cpu (with tags: host, region, core)")
    print("  - memory (with tags: host, region)")
    print("  - disk (with tags: host, region, device)")
    print("  - network (with tags: host, region, interface, fields: bytes_in, bytes_out)")
    print("  - temperature (with tags: host, room)")
    print()
    print("Sample queries:")
    print("  SELECT * FROM cpu WHERE host='server01' LIMIT 100")
    print("  SELECT mean(value) FROM memory GROUP BY host")
    print("  SELECT * FROM disk WHERE region='us-west'")

if __name__ == "__main__":
    main()

