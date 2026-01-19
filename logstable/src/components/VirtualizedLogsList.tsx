import { LogEntry, transformData } from '@perses-dev/core';
// import { useTheme } from '@emotion/react';
import { useMemo, useState } from 'react';
import { PaginationState } from '@tanstack/react-table';
import { Table, TableColumnConfig } from '@perses-dev/components';
import { LogsTableOptions } from '../model';
import { convertLogEntriesToLogTableRows } from './utils';

interface VirtualizedLogsListProps {
  logs: LogEntry[];
  spec: LogsTableOptions;
  contentDimensions?: { width: number; height: number };
}

export const VirtualizedLogsList: React.FC<VirtualizedLogsListProps> = ({
  logs: logsEntries,
  spec: { transforms },
  contentDimensions,
}) => {
  /* In case we have more than a query, there might be different results with different set of labels
     Clearly some cells may may remain empty because of none-overlapping results
  */
  const allColumns = useMemo((): string[] => {
    const set = new Set<string>(['timestamp']);
    logsEntries.forEach(({ labels }) => {
      Object.keys(labels).forEach((k) => {
        set.add(k);
      });
    });
    set.add('line');
    return Array.from(set);
  }, [logsEntries]);

  const columnsConfig = useMemo(() => {
    const columnsConfig: Array<TableColumnConfig<unknown>> = [];
    allColumns.forEach((column) => {
      columnsConfig.push({ header: column, accessorKey: column, width: 'auto' });
    });
    return columnsConfig;
  }, [allColumns]);

  const logsTableRecords: Array<Record<string, unknown>> = useMemo(() => {
    convertLogEntriesToLogTableRows(logsEntries, allColumns);
    return transformData(convertLogEntriesToLogTableRows(logsEntries, allColumns), transforms ?? []);
  }, [logsEntries, allColumns, transforms]);

  const [paginationSetting, setPaginationSetting] = useState<PaginationState | undefined>({
    pageIndex: 0,
    pageSize: 10,
  });

  console.log(contentDimensions?.width, contentDimensions?.height);

  return (
    <Table
      columns={columnsConfig}
      data={logsTableRecords}
      width={contentDimensions?.width ?? 0}
      height={contentDimensions?.height ?? 0}
      pagination={paginationSetting}
      onPaginationChange={setPaginationSetting}
    />
  );
};
