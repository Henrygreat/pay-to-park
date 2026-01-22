import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, requireRole, hashPassword } from "@/lib/auth";

interface ResetPasswordBody {
  newPassword: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN can reset passwords
  if (!requireRole(session, "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 }
    );
  }

  const { id: targetUserId } = await params;

  // Check target user exists
  const targetUser = await prisma.adminUser.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  try {
    const body: ResetPasswordBody = await request.json();
    const { newPassword } = body;

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.adminUser.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    // Get IP address from request
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET",
        actorId: session.userId,
        targetId: targetUserId,
        targetType: "AdminUser",
        details: JSON.stringify({
          targetUsername: targetUser.username,
          resetBy: session.username,
        }),
        ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset for ${targetUser.username}`,
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
