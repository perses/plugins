// Copyright 2024 The Perses Authors
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

import { PanelData, PanelProps } from '@perses-dev/plugin-system';
import { Table, TableCellConfigs, TableColumnConfig } from '@perses-dev/components';
import { ReactElement, useEffect, useMemo, useState } from 'react';
import { formatValue, Labels, QueryDataType, TimeSeries, TimeSeriesData, transformData } from '@perses-dev/core';
import { PaginationState, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useTheme, Theme } from '@mui/material';
import { ColumnSettings, TableOptions, evaluateConditionalFormatting } from '../models';
import { EmbeddedPanel } from './EmbeddedPanel';

function generateCellContentConfig(
  column: ColumnSettings
): Pick<TableColumnConfig<unknown>, 'cellDescription' | 'cell'> {
  const plugin = column.plugin;
  if (plugin !== undefined) {
    return {
      cell: (ctx) => {
        const panelData: PanelData<QueryDataType> | undefined = ctx.getValue();
        if (!panelData) return <></>;
        return <EmbeddedPanel kind={plugin.kind} spec={plugin.spec} queryResults={[panelData]} />;
      },
      cellDescription: column.cellDescription ? () => `${column.cellDescription}` : () => '', // disable hover text
    };
  }

  return {
    cell: (ctx) => {
      const cellValue = ctx.getValue();
      return typeof cellValue === 'number' && column.format ? formatValue(cellValue, column.format) : cellValue;
    },
    cellDescription: column.cellDescription ? (): string => `${column.cellDescription}` : undefined, // TODO: variable rendering + cell value
  };
}

interface ColumnFilterDropdownProps {
  allValues: Array<string | number>;
  selectedValues: Array<string | number>;
  onFilterChange: (values: Array<string | number>) => void;
  theme: Theme;
}

function ColumnFilterDropdown({
  allValues,
  selectedValues,
  onFilterChange,
  theme,
}: ColumnFilterDropdownProps): ReactElement {
  const values = [...new Set(allValues)].filter((v) => v != null).sort();
  if (values.length === 0) {
    return (
      <div
        data-filter-dropdown
        style={{
          width: 200,
          padding: 10,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 4,
          boxShadow: theme.shadows[4],
        }}
      >
        <div style={{ color: theme.palette.text.secondary, fontSize: 14 }}>No values found</div>
      </div>
    );
  }

  return (
    <div
      data-filter-dropdown
      style={{
        width: 200,
        padding: 10,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        boxShadow: theme.shadows[4],
        maxHeight: 250,
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedValues.length === values.length && values.length > 0}
            onChange={(e) => onFilterChange(e.target.checked ? values : [])}
            style={{ marginRight: 8 }}
          />
          <span style={{ color: theme.palette.text.primary }}>Select All ({values.length})</span>
        </label>
      </div>
      <hr
        style={{
          margin: '8px 0',
          border: 'none',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      />
      {values.map((value, index) => (
        <div key={`value-${index}`} style={{ marginBottom: 4 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '2px 0',
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.palette.action.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(value)}
              onChange={(e) => {
                if (e.target.checked) {
                  onFilterChange([...selectedValues, value]);
                } else {
                  onFilterChange(selectedValues.filter((v) => v !== value));
                }
              }}
              style={{ marginRight: 8 }}
            />
            <span
              style={{
                fontSize: 14,
                color: theme.palette.text.primary,
              }}
            >
              {value === null || value === undefined || value === '' ? '(empty)' : String(value)}
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}

/*
 * Generate column config from column definitions, if a column has multiple definitions, the first one will be used.
 * If column is hidden, return undefined.
 * If column do not have a definition, return a default column config.
 */
function generateColumnConfig(name: string, columnSettings: ColumnSettings[]): TableColumnConfig<unknown> | undefined {
  for (const column of columnSettings) {
    if (column.name === name) {
      if (column.hide) {
        return undefined;
      }

      return {
        accessorKey: name,
        header: column.header ?? name,
        headerDescription: column.headerDescription,
        enableSorting: column.enableSorting,
        width: column.width,
        align: column.align,
        ...generateCellContentConfig(column),
      };
    }
  }

  return {
    accessorKey: name,
    header: name,
  };
}

export function getTablePanelQueryOptions(spec: TableOptions): { mode: 'instant' | 'range' } {
  // if any cell renders a panel plugin, perform a range query instead of an instant query
  return {
    mode: (spec.columnSettings ?? []).some((c) => c.plugin) ? 'range' : 'instant',
  };
}

export type TableProps = PanelProps<TableOptions, TimeSeriesData>;

export function TablePanel({ contentDimensions, spec, queryResults }: TableProps): ReactElement | null {
  const theme = useTheme();

  // TODO: handle other query types
  const queryMode = getTablePanelQueryOptions(spec).mode;
  const rawData: Array<Record<string, unknown>> = useMemo(() => {
    // Transform query results to a tabular format:
    // [ { timestamp: 123, value: 456, labelName1: labelValue1 }, ... ]
    return queryResults
      .flatMap((data: PanelData<TimeSeriesData>, queryIndex: number) =>
        data.data.series.map((ts: TimeSeries) => ({ data, ts, queryIndex }))
      )
      .map(({ data, ts, queryIndex }: { data: PanelData<TimeSeriesData>; ts: TimeSeries; queryIndex: number }) => {
        if (ts.values[0] === undefined) {
          return { ...ts.labels };
        }

        // If there are multiple queries, we need to add the query index to the value key and label key to avoid conflicts
        const valueColumnName = queryResults.length === 1 ? 'value' : `value #${queryIndex + 1}`;
        const labels =
          queryResults.length === 1
            ? ts.labels
            : Object.entries(ts.labels ?? {}).reduce((acc, [key, value]) => {
                if (key) acc[`${key} #${queryIndex + 1}`] = value;
                return acc;
              }, {} as Labels);

        // If the cell visualization is a panel plugin, filter the data by the current series
        const columnValue = (spec.columnSettings ?? []).find((x) => x.name === valueColumnName)?.plugin
          ? { ...data, data: { ...data.data, series: data.data.series.filter((s) => s === ts) } }
          : ts.values[0][1];

        if (queryMode === 'instant') {
          // Timestamp is not indexed as it will be the same for all queries
          return { timestamp: ts.values[0][0], [valueColumnName]: columnValue, ...labels };
        } else {
          // Don't add a timestamp for range queries
          return { [valueColumnName]: columnValue, ...labels };
        }
      });
  }, [queryResults, queryMode, spec.columnSettings]);

  // Transform will be applied by their orders on the original data
  const data = transformData(rawData, spec.transforms ?? []);

  const keys: string[] = useMemo(() => {
    const result: string[] = [];

    for (const entry of data) {
      for (const key of Object.keys(entry)) {
        if (!result.includes(key)) {
          result.push(key);
        }
      }
    }

    return result;
  }, [data]);

  // fetch unique values for each column of filtering
  const columnUniqueValues = useMemo(() => {
    const uniqueValues: Record<string, Array<string | number>> = {};

    keys.forEach((key) => {
      const values = data.map((row) => row[key]).filter((val) => val !== null && val !== undefined && val !== '');
      uniqueValues[key] = Array.from(new Set(values as Array<string | number>));
    });

    return uniqueValues;
  }, [data, keys]);

  const columns: Array<TableColumnConfig<unknown>> = useMemo(() => {
    const columns: Array<TableColumnConfig<unknown>> = [];

    // Taking the customized columns first for the ordering of the columns in the table
    const customizedColumns =
      spec.columnSettings?.map((column) => column.name).filter((name) => keys.includes(name)) ?? [];
    const defaultColumns = keys.filter((key) => !customizedColumns.includes(key));

    for (const key of customizedColumns) {
      const columnConfig = generateColumnConfig(key, spec.columnSettings ?? []);
      if (columnConfig !== undefined) {
        columns.push(columnConfig);
      }
    }

    if (!spec.defaultColumnHidden) {
      for (const key of defaultColumns) {
        const columnConfig = generateColumnConfig(key, spec.columnSettings ?? []);
        if (columnConfig !== undefined) {
          columns.push(columnConfig);
        }
      }
    }

    return columns;
  }, [keys, spec.columnSettings, spec.defaultColumnHidden]);

  // Generate cell settings that will be used by the table to render cells (text color, background color, ...)
  const cellConfigs: TableCellConfigs = useMemo(() => {
    // If there are no cell settings globally or per column, return an empty object
    if (spec.cellSettings === undefined && !spec.columnSettings?.some((col) => col.cellSettings !== undefined)) {
      return {};
    }

    const result: TableCellConfigs = {};

    let index = 0;
    for (const row of data) {
      // Transforming key to object to extend the row with undefined values if the key is not present
      // for checking the cell config "Misc" condition with "null"
      const keysAsObj = keys.reduce(
        (acc, key) => {
          acc[key] = undefined;
          return acc;
        },
        {} as Record<string, undefined>
      );

      const extendRow = {
        ...keysAsObj,
        ...row,
      };

      for (const [key, value] of Object.entries(extendRow)) {
        // First, try to get cell config from global cell settings
        let cellConfig = evaluateConditionalFormatting(value, spec.cellSettings ?? []);

        // Then, try to get cell config from column-specific cell settings if conditional formatting is enabled
        const columnSetting = spec.columnSettings?.find((col) => col.name === key);
        if (columnSetting?.cellSettings?.length) {
          const columnCellConfig = evaluateConditionalFormatting(value, columnSetting.cellSettings);
          // Column-specific settings take precedence over global settings
          if (columnCellConfig) {
            cellConfig = columnCellConfig;
          }
        }

        if (cellConfig) {
          result[`${index}_${key}`] = cellConfig;
        }
      }
      index++;
    }

    return result;
  }, [data, keys, spec.cellSettings, spec.columnSettings]);

  function generateDefaultSortingState(): SortingState {
    return (
      spec.columnSettings
        ?.filter((column) => column.sort !== undefined)
        .map((column) => {
          return {
            id: column.name,
            desc: column.sort === 'desc',
          };
        }) ?? []
    );
  }

  const [sorting, setSorting] = useState<SortingState>(generateDefaultSortingState());

  // Filtering state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);

  // get selected values for a column
  const getSelectedFilterValues = (columnId: string): Array<string | number> => {
    const filter = columnFilters.find((f) => f.id === columnId);
    return filter ? (filter.value as Array<string | number>) : [];
  };

  // update column filter
  const updateColumnFilter = (columnId: string, values: Array<string | number>) => {
    const newFilters = columnFilters.filter((f) => f.id !== columnId);
    if (values.length > 0) {
      newFilters.push({ id: columnId, value: values });
    }
    setColumnFilters(newFilters);
  };

  // Handle filter clicks
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>, columnId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setFilterAnchorEl({ ...filterAnchorEl, [columnId]: event.currentTarget });
    setOpenFilterColumn(columnId);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl({});
    setOpenFilterColumn(null);
  };

  // Close filter when clicking outside
  useEffect(() => {
    if (!openFilterColumn) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-filter-dropdown]') && !target.closest('button')) {
        handleFilterClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [openFilterColumn]);

  // filter data based on the current filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // apply column filters if enabled
    if (spec.enableFiltering && columnFilters.length > 0) {
      filtered = filtered.filter((row) => {
        return columnFilters.every((filter) => {
          const value = row[filter.id];
          const filterValues = filter.value as Array<string | number>;

          if (!filterValues || filterValues.length === 0) return true; // No filter values means no filtering

          // Check if the row value is in the selected filter values
          return filterValues.includes(value as string | number);
        });
      });
    }

    return filtered;
  }, [data, columnFilters, spec.enableFiltering]);

  const [pagination, setPagination] = useState<PaginationState | undefined>(
    spec.pagination ? { pageIndex: 0, pageSize: 10 } : undefined
  );

  useEffect(() => {
    // If the pagination setting changes from no pagination to pagination, but the pagination state is undefined, update the pagination state
    if (spec.pagination && !pagination) {
      setPagination({ pageIndex: 0, pageSize: 10 });
    } else if (!spec.pagination && pagination) {
      setPagination(undefined);
    }
  }, [spec.pagination, pagination]);

  if (contentDimensions === undefined) {
    return null;
  }

  return (
    <div>
      {spec.enableFiltering && (
        <div
          style={{
            display: 'flex',
            background: theme.palette.background.default,
            borderBottom: `1px solid ${theme.palette.divider}`,
            width: contentDimensions.width,
            boxSizing: 'border-box',
          }}
        >
          {columns.map((column, idx) => {
            const filters = getSelectedFilterValues(column.accessorKey as string);
            const columnWidth = column.width || spec.defaultColumnWidth;
            return (
              <div
                key={`filter-${idx}`}
                style={{
                  padding: '8px',
                  borderRight: idx < columns.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  width: columnWidth,
                  minWidth: columnWidth,
                  maxWidth: columnWidth,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  boxSizing: 'border-box',
                  flex: typeof columnWidth === 'number' ? 'none' : '1 1 auto',
                }}
              >
                <span
                  style={{
                    marginRight: 8,
                    fontSize: '12px',
                    color: theme.palette.text.secondary,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {filters.length ? `${filters.length} items` : 'All'}
                </span>
                <button
                  onClick={(e) => {
                    handleFilterClick(e, column.accessorKey as string);
                  }}
                  style={{
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.background.paper,
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: filters.length ? theme.palette.primary.main : theme.palette.text.secondary,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    minWidth: '20px',
                    height: '24px',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.palette.action.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.palette.background.paper;
                  }}
                  type="button"
                >
                  ▼
                </button>

                {openFilterColumn === column.accessorKey && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 1000,
                      marginTop: 4,
                    }}
                  >
                    <ColumnFilterDropdown
                      allValues={columnUniqueValues[column.accessorKey as string] || []}
                      selectedValues={filters}
                      onFilterChange={(values) => updateColumnFilter(column.accessorKey as string, values)}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Table
        data={filteredData}
        columns={columns}
        cellConfigs={cellConfigs}
        height={spec.enableFiltering ? contentDimensions.height - 40 : contentDimensions.height}
        width={contentDimensions.width}
        density={spec.density}
        defaultColumnWidth={spec.defaultColumnWidth}
        defaultColumnHeight={spec.defaultColumnHeight}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  );
}
