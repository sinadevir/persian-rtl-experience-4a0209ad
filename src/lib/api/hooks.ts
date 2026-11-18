import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage, traceIdOf } from "./messages";

export function notifyError(e: unknown) {
  const trace = traceIdOf(e);
  toast.error(errorMessage(e), trace ? { description: `کد پیگیری: ${trace}` } : undefined);
}

/** Mutation with the standard UX: success toast, Persian error toast, and cache invalidation. */
export function useApiMutation<TVars = void, TRes = unknown>(
  fn: (v: TVars) => Promise<TRes>,
  opts: { success?: string | ((r: TRes, v: TVars) => string); invalidate?: QueryKey[]; onSuccess?: (r: TRes, v: TVars) => void; silentError?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      await Promise.all((opts.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })));
      const msg = typeof opts.success === "function" ? opts.success(r, v) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(r, v);
    },
    onError: (e) => { if (!opts.silentError) notifyError(e); },
  });
}
