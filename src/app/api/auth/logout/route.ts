import { NextRequest, NextResponse } from "next/server";
import { logoutUser, requireAuthContext } from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      throw new Error("Thiếu bearer token");
    }
    const { email } = requireAuthContext(token);
    logoutUser(email);
    return NextResponse.json({ message: "Đăng xuất thành công" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đăng xuất" },
      { status: 401 },
    );
  }
}
