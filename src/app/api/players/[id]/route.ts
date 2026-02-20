import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "CASHIER", "DEALER"]);
  if (error) return error;

  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      status: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
    },
  });

  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { firstName, lastName, phone, idNumber, photo, birthday, notes, statusId, rakebackPercent } = body;

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (phone !== undefined) data.phone = phone || null;
  if (idNumber !== undefined) data.idNumber = idNumber || null;
  if (photo !== undefined) data.photo = photo || null;
  if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null;
  if (notes !== undefined) data.notes = notes || null;
  if (statusId !== undefined) data.statusId = statusId || null;
  if (rakebackPercent !== undefined) data.rakebackPercent = rakebackPercent;

  const player = await prisma.player.update({
    where: { id },
    data,
    include: { status: true },
  });

  return NextResponse.json(player);
}
