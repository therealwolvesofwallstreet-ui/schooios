"use client";
// Tier high lỗi runtime (chunk-load reject / throw lúc render WebGL) → rơi xuống fallback (mid hoặc
// reduced), motion §6 graceful degrade. Tách riêng từ ReleaseBurst để Stage tổng quát dùng chung.
// ErrorBoundary BẮT BUỘC là class (React chưa có hook tương đương) — getDerivedStateFromError.
import { Component, type ReactNode } from "react";

export class StageBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
