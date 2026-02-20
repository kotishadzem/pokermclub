import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const statuses = await prisma.playerStatus.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(statuses);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const status = await prisma.playerStatus.create({ data: { name } });
  return NextResponse.json(status, { status: 201 });
}
