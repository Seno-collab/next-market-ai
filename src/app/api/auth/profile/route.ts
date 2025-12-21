import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      throw new Error("Thiếu bearer token");
    }
    const { user } = requireAuthContext(token);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể lấy hồ sơ" },
      { status: 401 },
    );
  }
}
