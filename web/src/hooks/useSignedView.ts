"use client";

// Lấy signed view URL cho 1 attachment. Cache trong session-scope Map để tránh gọi lại mỗi render.
// Re-fetch khi còn <5 phút là hết hạn. KHÔNG bao giờ lộ filePath.
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AttachmentViewResponse } from "@/lib/api-types";

interface CacheEntry {
  url: string;
  expiresAt: number; // unix ms
}

// Module-level cache: tồn tại trong session (SPA), reset khi refresh.
const viewCache = new Map<string, CacheEntry>();
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // refetch khi còn <5 phút

export interface SignedViewState {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSignedView(attachmentId: string): SignedViewState {
  const [state, setState] = useState<{ url: string | null; isLoading: boolean; error: string | null }>(
    () => {
      const cached = viewCache.get(attachmentId);
      if (cached && cached.expiresAt - Date.now() > REFRESH_BEFORE_EXPIRY_MS) {
        return { url: cached.url, isLoading: false, error: null };
      }
      return { url: null, isLoading: true, error: null };
    },
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // fetchTick increments to re-trigger the effect (timer expiry or manual refetch)
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    const cached = viewCache.get(attachmentId);
    const stillValid = cached && cached.expiresAt - Date.now() > REFRESH_BEFORE_EXPIRY_MS;
    if (stillValid) return;

    let cancelled = false;

    // Promise chain — setState calls happen async, NOT synchronous in effect body
    api
      .get<AttachmentViewResponse>(`/api/attachments/${attachmentId}/view`)
      .then((data) => {
        if (cancelled) return;
        const expiresAt = new Date(data.expiresAt).getTime();
        viewCache.set(attachmentId, { url: data.url, expiresAt });
        setState({ url: data.url, isLoading: false, error: null });
        // Schedule re-fetch before URL expires
        const refreshIn = expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
        if (refreshIn > 0) {
          timerRef.current = setTimeout(() => {
            if (!cancelled) setFetchTick((n) => n + 1);
          }, refreshIn);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError && e.status === 404
            ? "Ảnh không còn truy cập được."
            : "Không tải được ảnh.";
        setState({ url: null, isLoading: false, error: msg });
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [attachmentId, fetchTick]);

  return {
    ...state,
    refetch: () => {
      viewCache.delete(attachmentId);
      setFetchTick((n) => n + 1);
    },
  };
}
