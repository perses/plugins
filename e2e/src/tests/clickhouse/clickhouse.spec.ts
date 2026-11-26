// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DASHBOARD = '/projects/e2eproject/dashboards/clickhouse';
// The datasource of the dashboard is proxied by Perses: its requests are answered here, in place of ClickHouse.
const PROXY = /\/proxy\/globaldatasources\/e2e-clickhouse/;
const FORMAT = 'JSONCompactEachRowWithNamesAndTypes';

type Rows = unknown[][];

function minutesAgo(minutes: number): string {
  const time = new Date(Date.now() - minutes * 60_000);
  time.setUTCSeconds(0, 0);
  return time.toISOString().replace('.000Z', 'Z');
}

// What ClickHouse would answer to the statements of the dashboard.
function answer(sql: string): Rows {
  if (sql.includes('DISTINCT ServiceName')) {
    return [['ServiceName'], ['LowCardinality(String)'], ['checkout'], ['frontend']];
  }
  if (sql.includes('FROM otel_logs')) {
    return [
      ['Timestamp', 'Body', 'SeverityText', 'ServiceName'],
      ['DateTime64(9)', 'String', 'LowCardinality(String)', 'LowCardinality(String)'],
      [minutesAgo(1), 'payment failed: card declined', 'ERROR', 'checkout'],
      [minutesAgo(2), 'order placed', 'INFO', 'checkout'],
    ];
  }
  return [
    ['time', 'ServiceName', 'requests'],
    ['DateTime', 'LowCardinality(String)', 'UInt64'],
    [minutesAgo(3), 'checkout', '12'],
    [minutesAgo(2), 'checkout', '15'],
    [minutesAgo(1), 'checkout', '9'],
  ];
}

// Answers the queries of the page as ClickHouse does, and returns the statements it receives.
async function mockClickHouse(page: Page): Promise<string[]> {
  const statements: string[] = [];
  await page.route(PROXY, async (route) => {
    const sql = route.request().postData() ?? '';
    statements.push(sql);
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=UTF-8',
      headers: { 'X-ClickHouse-Format': FORMAT, 'X-ClickHouse-Timezone': 'UTC' },
      body: `${answer(sql)
        .map((row) => JSON.stringify(row))
        .join('\n')}\n`,
    });
  });
  return statements;
}

test.describe('ClickHouse plugin', () => {
  test('displays the results of its queries on a dashboard', async ({ page }) => {
    const statements = await mockClickHouse(page);

    await page.goto(DASHBOARD);

    // The series is named with the format of the query, and the logs are listed with their lines.
    await expect(page.getByText('requests of checkout')).toBeVisible();
    await expect(page.getByText('payment failed: card declined')).toBeVisible();

    // The chart query was sent with its macros and the variable of the dashboard replaced.
    const chartQuery = statements.find((sql) => sql.includes('AS requests')) ?? '';
    expect(chartQuery).toMatch(/toStartOfInterval\(toDateTime\(Timestamp\), INTERVAL \d+ second\) AS time/);
    expect(chartQuery).toMatch(/\(Timestamp >= toDateTime\(\d+\) AND Timestamp <= toDateTime\(\d+\)\)/);
    expect(chartQuery).toContain("ServiceName IN ('checkout')");
    expect(statements.join('\n')).not.toContain('$__');
  });

  test('lists the values of a variable from its query', async ({ page }) => {
    const statements = await mockClickHouse(page);

    await page.goto(DASHBOARD);
    await expect(page.getByText('requests of checkout')).toBeVisible();

    await page.getByRole('combobox', { name: 'service' }).click();
    await page.getByRole('option', { name: 'frontend' }).click();

    // Selecting a second value runs the chart query again with both of them.
    await expect
      .poll(() => statements.some((sql) => sql.includes("ServiceName IN ('checkout','frontend')")))
      .toBe(true);
  });

  test('displays the error of ClickHouse when a query fails', async ({ page }) => {
    await page.route(PROXY, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'text/plain; charset=UTF-8',
        body: "Code: 60. DB::Exception: Unknown table expression identifier 'otel_traces'. (UNKNOWN_TABLE) (version 26.9.1.1 (official build))\n",
      });
    });

    await page.goto(DASHBOARD);

    await expect(
      page.getByText('ClickHouse query failed: Code: 60. DB::Exception: Unknown table expression identifier').first(),
    ).toBeVisible();
  });
});
