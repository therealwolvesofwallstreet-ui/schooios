"use client";

// Hydration gate KHÔNG setState-in-effect. useSyncExternalStore trả false ở server + trong lúc
// hydrate, true sau khi client đã mount → vừa tránh hydration mismatch, vừa né cascading render
// (lint react-hooks/set-state-in-effect). Dùng để chặn submit/credential trước khi JS gắn handler
// (xem (public)/login, (public)/change-password).
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client snapshot: đã hydrate
    () => false, // server snapshot: chưa hydrate
  );
}
