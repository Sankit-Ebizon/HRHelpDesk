import { NextResponse, type NextRequest } from "next/server";
import { acceptInvitation, validateInviteToken } from "@/lib/invite-actions";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  const result = await validateInviteToken(token || "");

  let redirectUrl: URL;

  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "This invitation has expired. Ask your administrator for a new invite."
        : result.reason === "used"
          ? "This invitation link has already been used."
          : "This invitation link is invalid.";
    redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("message", message);
  } else {
    await acceptInvitation(result.userId, result.tokenId);
    redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("email", result.email);
    redirectUrl.searchParams.set("invited", "1");
    redirectUrl.searchParams.set(
      "message",
      "Invitation accepted. Use Forgot password to set your password, then sign in."
    );
  }

  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  return response;
}
