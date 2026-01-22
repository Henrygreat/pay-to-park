"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/sessions";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset password modal state
  const [resetModal, setResetModal] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users");

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (response.status === 403) {
        setError("Admin role required to view users");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setUsers(data.users);
      setCurrentUserId(data.currentUserId);
    } catch {
      setError("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetPassword = async () => {
    if (!resetModal.user || !newPassword) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/users/${resetModal.user.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setSuccess(`Password reset for ${resetModal.user.username}`);
      setResetModal({ open: false, user: null });
      setNewPassword("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Users</h1>
            <p className="text-sm text-gray-600">Manage admin accounts</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/verify"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Verify
            </a>
            <a
              href="/admin/pricing"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Pricing
            </a>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Users</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {user.username}
                    </span>
                    {user.id === currentUserId && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                    <span>Created {formatDateTime(new Date(user.createdAt))}</span>
                  </div>
                </div>
                <button
                  onClick={() => setResetModal({ open: true, user })}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Reset Password
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          <p>
            <strong>Break-glass reset:</strong> If locked out, use the{" "}
            <code className="bg-yellow-100 px-1 rounded">ADMIN_RESET_SECRET</code>{" "}
            environment variable via the API endpoint{" "}
            <code className="bg-yellow-100 px-1 rounded">
              POST /api/admin/users/reset-break-glass
            </code>
          </p>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal.open && resetModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reset Password
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a new password for{" "}
              <span className="font-medium">{resetModal.user.username}</span>
            </p>

            <div className="mb-4">
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResetModal({ open: false, user: null });
                  setNewPassword("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isResetting || !newPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
