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
      // In local development or reverse proxy/tunneling setups, prefer 127.0.0.1 to avoid
      // hairpin NAT, public DNS delays, or Edge runtime external fetch deadlocks.
      const localOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`;
      const isDev = process.env.NODE_ENV === 'development';
      const primaryUrl = isDev ? `${localOrigin}/api/auth/check` : `${request.nextUrl.origin}/api/auth/check`;

      let res: Response;
      try {
        res = await fetch(primaryUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (primaryErr) {
        // Fallback to the alternative origin if primary fetch fails
        const fallbackUrl = isDev ? `${request.nextUrl.origin}/api/auth/check` : `${localOrigin}/api/auth/check`;
        res = await fetch(fallbackUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

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
