import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const COOKIE_NAME = 'ganit-pharma-auth';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: COOKIE_NAME,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: any;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Only protect dashboard routes.
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // If Supabase Auth explicitly says there is no valid user,
      // send the user to the login page.
      if (error || !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.search = '';
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // Do not allow an unexpected auth error to crash middleware.
      console.error('Supabase middleware authentication error:', error);

      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Important: return the Supabase response so refreshed
  // authentication cookies are preserved.
  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
