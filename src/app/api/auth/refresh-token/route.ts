import { NextResponse } from "next/server";
import { refreshTokens } from "@/features/auth/server/authService";

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) {
      throw new Error("Thiếu refresh token");
    }
    const tokens = refreshTokens(refreshToken);
    return NextResponse.json({ tokens });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể làm mới token" },
      { status: 400 },
    );
  }
}
