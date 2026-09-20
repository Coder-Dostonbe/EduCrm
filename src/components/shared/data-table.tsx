"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./skeletons";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** can be hidden via the columns menu (default true) */
  hideable?: boolean;
  defaultHidden?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  selectable?: boolean;
  /** rendered in the selection bar when rows are selected */
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  pageSizeOptions?: number[];
  initialSort?: { id: string; desc: boolean };
  /** rendered to the left of the columns button, above the table */
  toolbar?: React.ReactNode;
  showColumnsButton?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  bulkActions,
  onRowClick,
  loading = false,
  emptyState,
  pageSizeOptions = [10, 20, 50],
  initialSort,
  toolbar,
  showColumnsButton = true,
}: DataTableProps<T>) {
  const t = useT();
  const [sort, setSort] = React.useState<{ id: string; desc: boolean } | null>(
    initialSort ?? null
  );
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(pageSizeOptions[0]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id))
  );

  // Snap back to the first page when filtering shrinks the data below it.
  if (page > 0 && page * pageSize >= data.length) setPage(0);

  const visibleColumns = columns.filter((c) => !hidden.has(c.id));

  const sorted = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortAccessor) return data;
    const acc = col.sortAccessor;
    return [...data].sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.desc ? -cmp : cmp;
    });
  }, [data, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const pageRowIds = pageRows.map(getRowId);
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id));

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortAccessor) return;
    setSort((prev) =>
      prev?.id === col.id
        ? prev.desc
          ? null
          : { id: col.id, desc: true }
        : { id: col.id, desc: false }
    );
  };

  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

  if (loading) return <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} cols={visibleColumns.length || 5} />;

  return (
    <div className="space-y-3">
      {(toolbar || showColumnsButton) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {showColumnsButton && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto h-8 gap-1.5">
                  <Settings2 className="size-3.5" />
                  <span className="hidden sm:inline">{t.table.columns}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>{t.table.columns}</DropdownMenuLabel>
                {columns
                  .filter((c) => c.hideable !== false)
                  .map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={!hidden.has(c.id)}
                      onCheckedChange={(v) => {
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (v) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        });
                      }}
                    >
                      {c.header}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Selection bar */}
      {selectable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} {t.table.selected}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {bulkActions?.(Array.from(selected), clearSelection)}
          </div>
        </div>
      )}

      {data.length === 0 ? (
        (emptyState ?? (
          <div className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
            {t.table.noData}
          </div>
        ))
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    {selectable && (
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(v) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (v) pageRowIds.forEach((id) => next.add(id));
                              else pageRowIds.forEach((id) => next.delete(id));
                              return next;
                            });
                          }}
                          aria-label={t.a11y.selectAll}
                        />
                      </TableHead>
                    )}
                    {visibleColumns.map((col) => (
                      <TableHead
                        key={col.id}
                        className={cn("whitespace-nowrap", col.headerClassName)}
                      >
                        {col.sortAccessor ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col)}
                            className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
                          >
                            {col.header}
                            {sort?.id === col.id ? (
                              sort.desc ? (
                                <ArrowDown className="size-3.5" />
                              ) : (
                                <ArrowUp className="size-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const id = getRowId(row);
                    return (
                      <TableRow
                        key={id}
                        data-state={selected.has(id) ? "selected" : undefined}
                        className={cn(
                          onRowClick &&
                            "cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                        )}
                        tabIndex={onRowClick ? 0 : undefined}
                        role={onRowClick ? "button" : undefined}
                        onClick={() => onRowClick?.(row)}
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onRowClick(row);
                                }
                              }
                            : undefined
                        }
                      >
                        {selectable && (
                          <TableCell className="w-10 pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(id)}
                              onCheckedChange={(v) => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (v) next.add(id);
                                  else next.delete(id);
                                  return next;
                                });
                              }}
                              aria-label={t.a11y.selectRow}
                            />
                          </TableCell>
                        )}
                        {visibleColumns.map((col) => (
                          <TableCell key={col.id} className={col.className}>
                            {col.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">{t.table.rowsPerPage}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
              >
                <SelectTrigger size="sm" className="w-17">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-2 text-sm text-muted-foreground tabular-nums">
                {t.table.page} {page + 1} {t.table.of} {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === 0}
                onClick={() => setPage(0)}
                aria-label={t.a11y.firstPage}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label={t.a11y.prevPage}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label={t.a11y.nextPage}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
                aria-label={t.a11y.lastPage}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
