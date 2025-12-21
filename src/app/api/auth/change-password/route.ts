import {
  changePassword,
  requireAuthContext,
} from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      throw new Error("Thiếu thông tin mật khẩu");
    }
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      throw new Error("Thiếu bearer token");
    }
    const { email } = requireAuthContext(token);
    const user = changePassword(email, currentPassword, newPassword);
    return NextResponse.json({ user, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Không thể đổi mật khẩu",
      },
      { status: 400 }
    );
  }
}
