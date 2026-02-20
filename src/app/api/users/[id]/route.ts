import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { username, password, role, name, active } = body;

  const data: Record<string, unknown> = {};
  if (username) data.username = username;
  if (role) data.role = role;
  if (name) data.name = name;
  if (typeof active === "boolean") data.active = active;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, name: true, active: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
