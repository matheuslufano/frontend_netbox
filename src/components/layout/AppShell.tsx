"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [checkingAuth, setCheckingAuth] = useState(() => !isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    const token = window.localStorage.getItem("afiliados_netbox_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const authCheck = window.setTimeout(() => {
      setCheckingAuth(false);
    }, 0);

    return () => window.clearTimeout(authCheck);
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main">
        <Header />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
