import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('firebase-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const origin = request.nextUrl.origin;
      const res = await fetch(`${origin}/api/auth/check`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      const data = await res.json();
      if (!data.authorized) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch (err) {
      console.error("Middleware auth check failed:", err);
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
}
