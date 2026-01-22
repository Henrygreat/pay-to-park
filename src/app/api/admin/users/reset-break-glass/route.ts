import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

interface BreakGlassResetBody {
  secret: string;
  username: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  const ADMIN_RESET_SECRET = process.env.ADMIN_RESET_SECRET;

  if (!ADMIN_RESET_SECRET) {
    return NextResponse.json(
      { error: "Break-glass reset not configured" },
      { status: 503 }
    );
  }

  try {
    const body: BreakGlassResetBody = await request.json();
    const { secret, username, newPassword } = body;

    // Validate secret
    if (!secret || secret !== ADMIN_RESET_SECRET) {
      // Log failed attempt
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "unknown";

      await prisma.auditLog.create({
        data: {
          action: "BREAK_GLASS_FAILED",
          actorId: null,
          targetId: null,
          targetType: "AdminUser",
          details: JSON.stringify({
            attemptedUsername: username || "unknown",
            reason: "Invalid secret",
          }),
          ipAddress,
        },
      });

      return NextResponse.json(
        { error: "Invalid secret" },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.adminUser.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Get IP address
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "BREAK_GLASS_RESET",
        actorId: null, // No authenticated actor
        targetId: user.id,
        targetType: "AdminUser",
        details: JSON.stringify({
          targetUsername: user.username,
          method: "break-glass",
        }),
        ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${user.username} via break-glass`,
    });
  } catch (error) {
    console.error("Break-glass reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
