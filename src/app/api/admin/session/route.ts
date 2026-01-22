import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { withDisplayStatuses } from "@/lib/sessions";

function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[\s-]/g, "");
}

export async function GET(request: NextRequest) {
  // Verify admin session
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const plate = searchParams.get("plate");

  if (!plate) {
    return NextResponse.json(
      { error: "Plate number is required" },
      { status: 400 }
    );
  }

  const normalizedPlate = normalizePlate(plate);

  if (normalizedPlate.length < 2) {
    return NextResponse.json(
      { error: "Plate number too short" },
      { status: 400 }
    );
  }

  // Find all sessions for this plate
  const sessions = await prisma.parkingSession.findMany({
    where: {
      plateNumber: normalizedPlate,
    },
    orderBy: { createdAt: "desc" },
  });

  if (sessions.length === 0) {
    return NextResponse.json({
      found: false,
      plate: normalizedPlate,
      sessions: [],
    });
  }

  // Add computed display status to each session
  const sessionsWithStatus = withDisplayStatuses(sessions);

  return NextResponse.json({
    found: true,
    plate: normalizedPlate,
    sessions: sessionsWithStatus.map((s) => ({
      id: s.id,
      plateNumber: s.plateNumber,
      carMake: s.carMake,
      email: s.email,
      passType: s.passType,
      status: s.status,
      displayStatus: s.displayStatus,
      tariffName: s.tariffName,
      tariffPriceAmount: s.tariffPriceAmount,
      tariffCurrency: s.tariffCurrency,
      startTime: s.startTime,
      endTime: s.endTime,
      stripeCheckoutSessionId: s.stripeCheckoutSessionId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      createdAt: s.createdAt,
    })),
  });
}
