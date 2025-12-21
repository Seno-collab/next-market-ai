import { NextResponse } from "next/server";
import { getMenuAnalytics } from "@/features/menu/server/menuStore";

export async function GET() {
  const analytics = getMenuAnalytics();
  return NextResponse.json({ analytics });
}
