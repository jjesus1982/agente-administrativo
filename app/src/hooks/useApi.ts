"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface UseApiOptions<T> {
  initialData?: T;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useApi<T>(
  endpoint: string,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, immediate = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(initialData as T | null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async (): Promise<T | null> => {
    if (!mountedRef.current) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(endpoint);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro ${response.status}`);
      }

      const result = await response.json();

      if (mountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erro desconhecido");

      if (mountedRef.current) {
        setError(error);
        onError?.(error);
      }

      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData as T | null);
    setError(null);
    setLoading(false);
  }, [initialData]);

  useEffect(() => {
    mountedRef.current = true;

    if (immediate) {
      execute();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [immediate, execute]);

  return { data, loading, error, execute, reset, setData };
}

// Hook for mutations (POST, PUT, DELETE)
interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseMutationResult<T, V> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  mutate: (variables: V) => Promise<T | null>;
  reset: () => void;
}

export function useMutation<T, V = unknown>(
  method: "post" | "put" | "patch" | "delete",
  endpoint: string,
  options: UseMutationOptions<T> = {}
): UseMutationResult<T, V> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        let response: Response;
        if (method === "delete") {
          response = await api.delete(endpoint);
        } else {
          response = await api[method](endpoint, variables);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Erro ${response.status}`);
        }

        // DELETE might not return content
        if (response.status === 204) {
          onSuccess?.({} as T);
          return {} as T;
        }

        const result = await response.json();
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro desconhecido");
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [method, endpoint, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, mutate, reset };
}

// Hook for paginated data
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  has_next: boolean;
}

interface UsePaginatedApiResult<T> {
  data: T[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setPage: (page: number) => void;
}

export function usePaginatedApi<T>(
  endpoint: string,
  pageSize = 20
): UsePaginatedApiResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const url = `${endpoint}${separator}page=${pageNum}&limit=${pageSize}`;
        const response = await api.get(url);

        if (!response.ok) {
          throw new Error(`Erro ${response.status}`);
        }

        const result: PaginatedResult<T> = await response.json();

        setData((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setHasMore(result.has_next);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro desconhecido"));
      } finally {
        setLoading(false);
      }
    },
    [endpoint, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPage(page + 1, true);
  }, [hasMore, loading, page, fetchPage]);

  const refresh = useCallback(async () => {
    setData([]);
    await fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  return {
    data,
    total,
    page,
    hasMore,
    loading,
    error,
    loadMore,
    refresh,
    setPage: (p: number) => fetchPage(p, false),
  };
}

export default useApi;
