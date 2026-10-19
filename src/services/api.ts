// ตัวเรียก API กลาง: ส่ง cookie login ไปด้วยทุกครั้ง; 401 = เซสชันหมดอายุ → กลับหน้า login
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** true = ไม่พากลับหน้า login เมื่อ 401 (ใช้กับ /auth/*) */
  noRedirect?: boolean;
}

export async function api<T>(path: string, { method = "GET", body, query, noRedirect }: Options = {}): Promise<T> {
  const qs = query ? new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => e[1] !== undefined)).toString() : "";
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
  }
  if (res.status === 401 && !noRedirect && typeof window !== "undefined" && window.location.pathname !== "/login") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- นอก React; ต้องการโหลดหน้าใหม่ทั้งหมดเพื่อล้างสถานะเดิม
    window.location.assign("/login");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data === "object" && data !== null && "error" in data ? String((data as { error: unknown }).error) : `ผิดพลาด (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}
