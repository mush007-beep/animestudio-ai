"use client";

import { useRouter } from "next/navigation";
import { clearAuth, gateEnabled } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();
  if (!gateEnabled()) return null;
  return (
    <button
      onClick={() => {
        clearAuth();
        router.replace("/login");
      }}
      className="text-xs text-neutral-500 hover:text-neutral-300"
    >
      Log out
    </button>
  );
}
