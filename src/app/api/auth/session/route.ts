import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const GET = withApiLogging(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true });
});
