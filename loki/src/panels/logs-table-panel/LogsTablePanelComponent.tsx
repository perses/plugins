import { ReactElement } from "react";
import { LogsTablePanelProps } from "./logs-table-panel-types";

function formatTimestamp(ts: string | number): string {
  const n = typeof ts === 'string' ? Number(ts) : ts;
  if (isNaN(n)) return String(ts);
  // If it's in ms, convert to Date
  const date = new Date(n > 1e12 ? n : n * 1000);
  return date.toLocaleString();
}

export function LogsTablePanelComponent(props: LogsTablePanelProps): ReactElement | null {
  const { queryResults, spec } = props;

  // Flatten all rows from all queries, guard against missing data/metadata
  const rows = queryResults.flatMap(q => q?.data?.metadata?.rows ?? []);
  if (rows.length === 0) return <div>No logs found.</div>;

  // Ensure timestamp is always first
  const allKeys = Object.keys(rows[0]!);
  const columns = ["timestamp", ...allKeys.filter((k) => k !== "timestamp")];

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col}>
                {col === 'timestamp'
                  ? row[col] !== undefined
                    ? formatTimestamp(row[col] as string | number)
                    : ''
                  : row[col]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}