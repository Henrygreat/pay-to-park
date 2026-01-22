import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tariffs = await prisma.tariff.findMany({
    orderBy: { durationMinutes: "asc" },
  });

  return NextResponse.json({
    tariffs: tariffs.map((t) => ({
      passType: t.passType,
      name: t.name,
      priceAmount: t.priceAmount,
      currency: t.currency,
      durationMinutes: t.durationMinutes,
      isActive: t.isActive,
      isRecommended: t.isRecommended,
    })),
    role: session.role,
  });
}
