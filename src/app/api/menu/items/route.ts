import {
  createMenuItem,
  listMenuItems,
} from "@/features/menu/server/menuStore";
import { NextResponse } from "next/server";

export async function GET() {
  const items = listMenuItems();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const item = createMenuItem(payload);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo món" },
      { status: 400 }
    );
  }
}
