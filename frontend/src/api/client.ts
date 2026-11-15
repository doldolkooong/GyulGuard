export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "요청을 처리하지 못했습니다. 입력과 서버 연결을 확인해 주세요.",
    );
  }
  return res.json();
}
export const num = (n: number | null | undefined, digits = 0) =>
  n == null
    ? "—"
    : n.toLocaleString("ko-KR", { maximumFractionDigits: digits });
export const date = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
