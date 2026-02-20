import { getVersion } from "@/lib/version";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ version: getVersion() });
}
