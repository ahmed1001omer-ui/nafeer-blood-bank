import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "bbms-local-dev-secret-change-in-production-please",
);

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/setup",
  "/api/setup",
  "/forgot-password",
  "/reset-password",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
  "/api/network-status",
];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("bbms_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // السماح بالوصول الكامل لـ API تطبيق الهاتف مع ترويسات CORS
  if (pathname.startsWith("/api/mobile/")) {
    if (request.method === "OPTIONS") {
      const res = new NextResponse(null, { status: 204 });
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    return withSecurityHeaders(res);
  }

  // ملفات ثابتة وموارد Next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/icon.svg" ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const valid = await hasValidSession(request);

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json({ message: "يجب تسجيل الدخول" }, { status: 401 })
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
