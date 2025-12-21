import { NextResponse } from "next/server";
import { loginUser } from "@/features/auth/server/authService";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = loginUser(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đăng nhập" },
      { status: 400 },
    );
  }
}
