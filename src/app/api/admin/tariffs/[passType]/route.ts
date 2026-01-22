import { NextRequest, NextResponse } from "next/server";
import { PassType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession, requireRole } from "@/lib/auth";

interface TariffUpdateBody {
  priceAmount: number;
  currency: string;
  isActive: boolean;
  isRecommended: boolean;
}

const VALID_PASS_TYPES: PassType[] = ["DAILY", "WEEKLY", "MONTHLY"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ passType: string }> }
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN can update tariffs
  if (!requireRole(session, "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 }
    );
  }

  const { passType } = await params;

  if (!VALID_PASS_TYPES.includes(passType as PassType)) {
    return NextResponse.json(
      { error: "Invalid pass type" },
      { status: 400 }
    );
  }

  try {
    const body: TariffUpdateBody = await request.json();
    const { priceAmount, currency, isActive, isRecommended } = body;

    // Validate price
    if (typeof priceAmount !== "number" || priceAmount < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate currency
    if (!currency || typeof currency !== "string" || currency.length !== 3) {
      return NextResponse.json(
        { error: "Currency must be a 3-letter code" },
        { status: 400 }
      );
    }

    // If setting isRecommended to true, unset others first
    if (isRecommended) {
      await prisma.tariff.updateMany({
        where: { isRecommended: true },
        data: { isRecommended: false },
      });
    }

    const updatedTariff = await prisma.tariff.update({
      where: { passType: passType as PassType },
      data: {
        priceAmount: Math.round(priceAmount),
        currency: currency.toLowerCase(),
        isActive: Boolean(isActive),
        isRecommended: Boolean(isRecommended),
      },
    });

    return NextResponse.json({
      success: true,
      tariff: {
        passType: updatedTariff.passType,
        name: updatedTariff.name,
        priceAmount: updatedTariff.priceAmount,
        currency: updatedTariff.currency,
        durationMinutes: updatedTariff.durationMinutes,
        isActive: updatedTariff.isActive,
        isRecommended: updatedTariff.isRecommended,
      },
    });
  } catch (error) {
    console.error("Tariff update error:", error);
    return NextResponse.json(
      { error: "Failed to update tariff" },
      { status: 500 }
    );
  }
}
