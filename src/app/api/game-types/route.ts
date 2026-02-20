import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const gameTypes = await prisma.gameType.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(gameTypes);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const gameType = await prisma.gameType.create({ data: { name, description } });
  return NextResponse.json(gameType, { status: 201 });
}
