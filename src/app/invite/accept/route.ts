import { NextResponse, type NextRequest } from "next/server";
import { acceptInvitation, validateInviteToken } from "@/lib/invite-actions";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";

function loginRedirect(origin: string, message: string, email?: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("message", message);
  if (email) url.searchParams.set("email", email);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  const result = await validateInviteToken(token || "");

  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "This invitation has expired. Ask your administrator for a new invite."
        : result.reason === "used"
          ? "This invitation link has already been used."
          : "This invitation link is invalid.";
    return loginRedirect(origin, message);
  }

  await acceptInvitation(result.userId, result.tokenId);

  const admin = createServiceClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: result.email,
    options: {
      redirectTo: `${origin}/auth/callback?next=/set-password`,
    },
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return loginRedirect(
      origin,
      "Invitation accepted but we could not start password setup. Use Forgot password on the login page.",
      result.email
    );
  }

  const redirectUrl = new URL("/set-password", origin);
  redirectUrl.searchParams.set("email", result.email);
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

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: "recovery",
  });

  if (verifyError) {
    return loginRedirect(
      origin,
      "Invitation accepted but password setup could not be started. Use Forgot password on the login page.",
      result.email
    );
  }

  return response;
}
