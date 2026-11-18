import { keepPreviousData, queryOptions, type QueryKey } from "@tanstack/react-query";
import { apiRequest, type QueryValue } from "./client";
import type { ApiService } from "./config";
import { toList, toPage, type Page, type Rec } from "./list";

export type PageParams = { page?: number; pageSize?: number } & Record<string, QueryValue>;
export const DEFAULT_PAGE_SIZE = 20;

/** Server-paged list: the backend does the search/filter/paging, the table only renders. */
export function pagedQuery<T>(key: QueryKey, service: ApiService, path: string, params: PageParams, map: (r: Rec) => T, enabled = true) {
  const p = { page: 1, pageSize: DEFAULT_PAGE_SIZE, ...params };
  return queryOptions({
    queryKey: [...key, "page", p],
    queryFn: async ({ signal }): Promise<Page<T>> => {
      const pg = toPage<Rec>(await apiRequest(service, path, { query: p, signal }), p.page, p.pageSize);
      return { ...pg, items: pg.items.map(map) };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function listQuery<T>(key: QueryKey, service: ApiService, path: string, query: Record<string, QueryValue> | undefined, map: (r: Rec) => T, enabled = true) {
  return queryOptions({
    queryKey: [...key, "list", query ?? {}],
    queryFn: async ({ signal }) => toList<Rec>(await apiRequest(service, path, { query, signal })).map(map),
    enabled,
  });
}

export function itemQuery<T>(key: QueryKey, service: ApiService, path: string, map: (r: Rec) => T, query?: Record<string, QueryValue>, enabled = true) {
  return queryOptions({
    queryKey: [...key, "item", query ?? {}],
    queryFn: async ({ signal }) => map(((await apiRequest(service, path, { query, signal })) ?? {}) as Rec),
    enabled,
  });
}
