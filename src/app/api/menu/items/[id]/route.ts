import { NextResponse } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/features/menu/server/menuStore";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await request.json();
    const item = updateMenuItem(params.id, payload);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể cập nhật món" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    deleteMenuItem(params.id);
    return NextResponse.json({ message: "Đã xoá món" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể xoá món" },
      { status: 400 },
    );
  }
}
