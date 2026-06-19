"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CompactHeader from "./CompactHeader";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isSettingsPage = pathname === "/configuracoes";
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
        {isSettingsPage ? <Header /> : <CompactHeader />}
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
