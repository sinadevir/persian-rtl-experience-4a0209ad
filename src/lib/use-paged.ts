import { useState } from "react";

/** Paging + search + filter state for a server-paged list. Changing search or a filter returns to page 1. */
export function usePaged<F extends Record<string, string> = Record<string, string>>(initialFilters?: F, pageSize = 20) {
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<F>((initialFilters ?? {}) as F);
  return {
    page, pageSize, search, filters,
    setPage,
    setSearch: (q: string) => { setSearchState(q); setPage(1); },
    setFilter: (k: string, v: string) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); },
    server: (total: number) => ({
      total, page, pageSize, onPageChange: setPage, search,
      onSearchChange: (q: string) => { setSearchState(q); setPage(1); },
      filterValues: filters as Record<string, string>,
      onFilterChange: (k: string, v: string) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); },
    }),
  };
}
