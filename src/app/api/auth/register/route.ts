import { NextResponse } from "next/server";
import { registerUser } from "@/features/auth/server/authService";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = registerUser(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đăng ký" },
      { status: 400 },
    );
  }
}
