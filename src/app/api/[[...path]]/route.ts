// API ของ LottoDesk รันในโปรเจกต์เดียวกับหน้าเว็บ (โค้ด Express อยู่ใน backend/)
// หลักการ: เปิด http server ของ Express ไว้ในโปรเจกต์ที่พอร์ตสุ่มบน 127.0.0.1 แล้วส่งต่อ request มาที่นั่น
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../../../../backend/src/app";
import { loadConfig } from "../../../../backend/src/config";
import { connectDb } from "../../../../backend/src/db";

export const maxDuration = 30;

interface Runtime { port: Promise<number> }
const globals = globalThis as typeof globalThis & { __lottodesk?: Runtime };

function boot(): Runtime {
  const config = loadConfig();
  const server: Server = createServer(createApp(config));
  const port = new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
  return { port };
}

async function handler(request: Request): Promise<Response> {
  try {
    const runtime = (globals.__lottodesk ??= boot());
    await connectDb(loadConfig());
    const port = await runtime.port;
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.delete("host");
    const upstream = await fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      // @ts-expect-error duplex จำเป็นเมื่อส่ง stream เป็น body (Node fetch)
      duplex: "half",
    });
    // fetch ถอดการบีบอัดให้แล้ว จึงต้องตัด header ที่ไม่ตรงกับ body
    const out = new Headers(upstream.headers);
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง" }, { status: 503 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
