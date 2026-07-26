"use client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { getErrorMessage } from "@/lib/api";

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  immediate?: boolean;
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  options: UseApiOptions<T> = {},
) {
  const { onSuccess, onError, immediate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid stale closures and prevent infinite re-render loops
  // when callers pass inline functions as fetcher/callbacks
  const fetcherRef = useRef(fetcher);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    fetcherRef.current = fetcher;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetcherRef.current();
      setData(response.data);
      onSuccessRef.current?.(response.data);
      return response.data;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      onErrorRef.current?.(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasRun = useRef(false);
  useEffect(() => {
    if (immediate && !hasRun.current) {
      hasRun.current = true;
      startTransition(() => {
        execute();
      });
    }
  }, [immediate, execute]);

  return { data, isLoading, error, execute, setData };
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await mutationFn(variables);
        return response.data;
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn],
  );

  return { mutate, isLoading, error };
}
