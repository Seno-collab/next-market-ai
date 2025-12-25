import { NextResponse, type NextRequest } from "next/server";
import { deleteMenuItem, updateMenuItem } from "@/features/menu/server/menuStore";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const PATCH = withApiLogging(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const t = createTranslator(getRequestLocale(request));
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const item = updateMenuItem(id, payload);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.updateFailed") },
      { status: 400 },
    );
  }
});

export const DELETE = withApiLogging(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const t = createTranslator(getRequestLocale(request));
  try {
    const { id } = await context.params;
    deleteMenuItem(id);
    return NextResponse.json({ message: t("menu.success.delete") });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.deleteFailed") },
      { status: 400 },
    );
  }
});
