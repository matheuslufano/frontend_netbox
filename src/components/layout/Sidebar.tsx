"use client";

// src/components/layout/Sidebar.tsx

import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BsClipboardDataFill } from "react-icons/bs";
import { FiDatabase } from "react-icons/fi";
import { FaGear } from "react-icons/fa6";
import { ImUsers } from "react-icons/im";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { MdSpaceDashboard } from "react-icons/md";
import { PiLinkFill } from "react-icons/pi";
import { RiLogoutBoxFill } from "react-icons/ri";

import logo1 from "../../../public/logo.jpg";
import styles from "./sidebar.module.css";

type UserPhoto = string | StaticImageData;

type StoredUser = {
  name?: string | null;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  photo?: string | null;
  avatar?: string | null;
  image?: string | null;
  foto?: string | null;
  profilePhoto?: string | null;
  profile_photo?: string | null;
};

function getStoredUserPhoto(user: StoredUser) {
  return (
    user.photoUrl ||
    user.avatarUrl ||
    user.photo ||
    user.avatar ||
    user.image ||
    user.foto ||
    user.profilePhoto ||
    user.profile_photo ||
    null
  );
}

export default function Sidebar() {
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userPhoto, setUserPhoto] = useState<UserPhoto>(logo1);
  const [userName, setUserName] = useState("usuario");

  useEffect(() => {
    function loadStoredUser() {
      const storedUser = window.localStorage.getItem("afiliados_netbox_user");

      if (!storedUser) {
        setUserPhoto(logo1);
        setUserName("usuario");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as StoredUser;
        const photo = getStoredUserPhoto(parsedUser);

        setUserName(parsedUser.name || "usuario");
        setUserPhoto(photo || logo1);
      } catch {
        setUserPhoto(logo1);
        setUserName("usuario");
      }
    }

    loadStoredUser();

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "afiliados_netbox_user") {
        loadStoredUser();
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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
      </div>

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

      <div className={styles.profileBox} title={userName}>
        <div className={styles.avatarFrame}>
        <Image
          src={userPhoto}
          alt="Foto do usuário"
          className={styles.userPhoto}
          width={88}
          height={88}
          unoptimized={typeof userPhoto === "string"}
          onError={() => setUserPhoto(logo1)}
          priority
        />

        <span className={styles.brandBubble} aria-label="Netbox">
          <Image
            src={logo1}
            alt="Netbox"
            className={styles.brandBubbleImg}
            width={24}
            height={24}
          />
        </span>
        </div>

        <strong className={styles.userName}>{userName}</strong>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          <li className={styles.button}>
            <Link
              href="/links-campanhas"
              className={styles.menuItem}
              aria-label="Links e Campanhas"
            >
              <PiLinkFill className={styles.icon} />
              <span className={styles.itemLabel}>Gerar Links</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/afiliado"
              className={styles.menuItem}
              aria-label="Afiliado"
            >
              <ImUsers className={styles.icon} />
              <span className={styles.itemLabel}>Afiliado</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/dashboard"
              className={styles.menuItem}
              aria-label="Dashboard"
            >
              <MdSpaceDashboard className={styles.icon} />
              <span className={styles.itemLabel}>Dashboard</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/relatorios"
              className={styles.menuItem}
              aria-label="Relatórios"
            >
              <BsClipboardDataFill className={styles.icon} />
              <span className={styles.itemLabel}>Relat&oacute;rios</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/sgp" className={styles.menuItem} aria-label="SGP">
              <FiDatabase className={styles.icon} />
              <span className={styles.itemLabel}>SGP</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/configuracoes"
              className={styles.menuItem}
              aria-label="Configurações"
            >
              <FaGear className={styles.icon} />
              <span className={styles.itemLabel}>
                Configura&ccedil;&otilde;es
              </span>
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
