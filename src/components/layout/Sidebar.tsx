"use client";

// src/components/layout/Sidebar.tsx

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BsClipboardDataFill, BsMegaphoneFill } from "react-icons/bs";
import { FaGear } from "react-icons/fa6";
import { ImUsers } from "react-icons/im";
import { IoChevronBack, IoChevronForward, IoFolderOpen } from "react-icons/io5";
import { MdSpaceDashboard } from "react-icons/md";
import { PiLinkFill } from "react-icons/pi";
import { RiLogoutBoxFill } from "react-icons/ri";

import logo1 from "../../../public/logo.jpg";
import styles from "./sidebar.module.css";
// import logo2 from "../../../../public/logo2.png";

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleToggleSidebar() {
    setIsCollapsed((current) => !current);
  }

  function handleLogout() {
    window.localStorage.removeItem("afiliados_netbox_token");
    window.localStorage.removeItem("afiliados_netbox_user");
    router.replace("/login");
  }

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.sidebarHeader}>
        <h2 className={styles.titulo}>AFILIADOS NETBOX</h2>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={handleToggleSidebar}
          aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {isCollapsed ? <IoChevronForward /> : <IoChevronBack />}
        </button>
      </div>

      <Image src={logo1} alt="logo" className={styles.img} width={200} />

      <nav>
        <ul className={styles.menuList}>
          <li className={styles.button}>
            <Link href="/links" className={styles.menuItem} aria-label="Links e QR">
              <PiLinkFill
                className={styles.icon}
                style={{ fontSize: "25px", minHeight: "25px" }}
              />
              <span className={styles.itemLabel}>Links e QR</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/afiliado" className={styles.menuItem} aria-label="Afiliado">
              <ImUsers className={styles.icon} />
              <span className={styles.itemLabel}>Afiliado</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/criar-campanha"
              className={styles.menuItem}
              aria-label="Criar Campanha"
            >
              <IoFolderOpen className={styles.icon} />
              <span className={styles.itemLabel}>Criar Campanha</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/campanhas" className={styles.menuItem} aria-label="Campanhas">
              <BsMegaphoneFill className={styles.icon} />
              <span className={styles.itemLabel}>Campanhas</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/dashboard" className={styles.menuItem} aria-label="Dashboard">
              <MdSpaceDashboard className={styles.icon} />
              <span className={styles.itemLabel}>Dashboard</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/relatorios" className={styles.menuItem} aria-label="Relatorios">
              <BsClipboardDataFill className={styles.icon} />
              <span className={styles.itemLabel}>Relat&oacute;rios</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/configuracoes"
              className={styles.menuItem}
              aria-label="Configuracoes"
            >
              <FaGear className={styles.icon} />
              <span className={styles.itemLabel}>Configura&ccedil;&otilde;es</span>
            </Link>
          </li>

          <li className={styles.button}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={handleLogout}
              aria-label="Sair"
            >
              <RiLogoutBoxFill className={styles.icon} />
              <span className={styles.itemLabel}>Sair</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
