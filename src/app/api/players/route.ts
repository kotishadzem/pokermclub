import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "CASHIER"]);
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") || "";
  const statusId = req.nextUrl.searchParams.get("statusId") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { idNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  if (statusId) {
    where.statusId = statusId;
  }

  const players = await prisma.player.findMany({
    where,
    include: { status: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "CASHIER"]);
  if (error) return error;

  const body = await req.json();
  const { firstName, lastName, phone, idNumber, photo, birthday, notes, statusId, rakebackPercent } = body;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name required" }, { status: 400 });
  }

  if (idNumber) {
    const existing = await prisma.player.findUnique({ where: { idNumber } });
    if (existing) {
      return NextResponse.json({ error: "Player with this ID number already exists" }, { status: 400 });
    }
  }

  const player = await prisma.player.create({
    data: {
      firstName,
      lastName,
      phone: phone || null,
      idNumber: idNumber || null,
      photo: photo || null,
      birthday: birthday ? new Date(birthday) : null,
      notes: notes || null,
      statusId: statusId || null,
      rakebackPercent: rakebackPercent || 0,
    },
    include: { status: true },
  });

  return NextResponse.json(player, { status: 201 });
}
