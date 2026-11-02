"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthed } from "@/lib/auth-client";

/** Client-side route guard for the static build (see lib/auth-client.ts). */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/login")) {
      setOk(true);
      return;
    }
    if (isAuthed()) setOk(true);
    else router.replace("/login");
  }, [pathname, router]);

  if (pathname?.startsWith("/login")) return <>{children}</>;
  if (!ok)
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-neutral-500">
        Checking access…
      </div>
    );
  return <>{children}</>;
}
