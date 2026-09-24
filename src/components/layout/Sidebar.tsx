"use client";

// src/components/layout/Sidebar.tsx

import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BsClipboardDataFill } from "react-icons/bs";
import { FiGitBranch, FiMousePointer, FiShare2, FiUser, FiUsers } from "react-icons/fi";
import { FaGear } from "react-icons/fa6";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { MdContactPhone, MdSpaceDashboard } from "react-icons/md";
import { PiLinkFill } from "react-icons/pi";
import { RiLogoutBoxFill } from "react-icons/ri";
import { obterPerfilAtual } from "@/lib/api";

import logo1 from "../../../public/logo.jpg";
import styles from "./sidebar.module.css";
import Avatar from "../profile/Avatar";

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
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userPhoto, setUserPhoto] = useState<UserPhoto>(logo1);
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState("usuário");

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setIsMounted(true), 0);
    function loadStoredUser() {
      const storedUser = window.localStorage.getItem("afiliados_netbox_user");

      if (!storedUser) {
        setUserPhoto(logo1);
        setUserName("usuário");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser) as StoredUser;
        const photo = getStoredUserPhoto(parsedUser);

        setUserName(parsedUser.name || "usuário");
        setUserPhoto(photo || logo1);
      } catch {
        setUserPhoto(logo1);
        setUserName("usuário");
      }
    }

    loadStoredUser();

    let cancelled = false;
    obterPerfilAtual()
      .then((profile) => {
        if (cancelled) return;
        const storedUser = window.localStorage.getItem("afiliados_netbox_user");
        const previous = storedUser
          ? JSON.parse(storedUser) as StoredUser & Record<string, unknown>
          : {};
        const current = { ...previous, ...profile };
        window.localStorage.setItem("afiliados_netbox_user", JSON.stringify(current));
        setUserName(profile.name || "usuÃ¡rio");
        setUserPhoto(profile.photoUrl || logo1);
      })
      .catch(() => {
        // Mantém os dados locais caso a consulta falhe temporariamente.
      });

    function handleStorageChange(event: StorageEvent) {
      if (event.key === "afiliados_netbox_user") {
        loadStoredUser();
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearTimeout(mountTimer);
      cancelled = true;
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

      {isMounted && createPortal(
        <button
          type="button"
          className={`${styles.collapseButton} ${isCollapsed ? styles.collapseButtonCollapsed : ""}`}
          onClick={handleToggleSidebar}
          aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {isCollapsed ? <IoChevronForward /> : <IoChevronBack />}
        </button>,
        document.body
      )}

      <div className={styles.profileBox} title={userName}>
        <div className={styles.avatarFrame}>
          <span className={styles.userPhotoFrame}>
          <Avatar
            name={userName}
            photoUrl={typeof userPhoto === "string" && userPhoto !== logo1.src ? userPhoto : undefined}
            alt="Foto do usuário"
            className={styles.userPhoto}
          />
          </span>

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
              href="/dashboard"
              className={styles.menuItem}
              aria-label="Dashboard"
            >
              <MdSpaceDashboard className={styles.icon} />
              <span className={styles.itemLabel}>Dashboard</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link href="/crm" className={styles.menuItem} aria-label="CRM">
              <MdContactPhone className={styles.icon} />
              <span className={styles.itemLabel}>CRM</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/contatos"
              className={`${styles.menuItem} ${pathname === "/contatos" ? styles.menuItemActive : ""}`}
              aria-label="Contatos"
              aria-current={pathname === "/contatos" ? "page" : undefined}
            >
              <FiUsers className={styles.icon} />
              <span className={styles.itemLabel}>Contatos</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/afiliado"
              className={`${styles.menuItem} ${pathname.startsWith("/afiliado") ? styles.menuItemActive : ""}`}
              aria-label="Afiliados"
              aria-current={pathname.startsWith("/afiliado") ? "page" : undefined}
            >
              <FiUser className={styles.icon} />
              <span className={styles.itemLabel}>Afiliados</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/fluxograma-conversoes"
              className={styles.menuItem}
              aria-label="Fluxograma de conversões"
            >
              <FiGitBranch className={styles.icon} />
              <span className={styles.itemLabel}>Fluxograma</span>
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
            <Link
              href="/links-campanhas/relatorios/cliques"
              className={`${styles.menuItem} ${pathname === "/links-campanhas/relatorios/cliques" ? styles.menuItemActive : ""}`}
              aria-label="Cliques"
              aria-current={pathname === "/links-campanhas/relatorios/cliques" ? "page" : undefined}
            >
              <FiMousePointer className={styles.icon} />
              <span className={styles.itemLabel}>Cliques</span>
            </Link>
          </li>

          <li className={styles.button}>
            <Link
              href="/integracoes"
              className={`${styles.menuItem} ${
                pathname === "/integracoes"
                  ? styles.menuItemActive
                  : ""
              }`}
              aria-label="Integrações"
              aria-current={pathname === "/integracoes" ? "page" : undefined}
            >
              <FiShare2 className={styles.icon} />
              <span className={styles.itemLabel}>Integrações</span>
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

          <li className={`${styles.button} ${styles.logoutButton}`}>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.logoutMenuItem}`}
              onClick={() => setShowLogoutModal(true)}
              aria-label="Sair"
            >
              <RiLogoutBoxFill className={styles.icon} />
              <span className={styles.itemLabel}>Sair</span>
            </button>
          </li>
        </ul>
      </nav>

      {showLogoutModal && (
        <div
          className={styles.logoutModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutModal(false);
            }
          }}
        >
          <section className={styles.logoutModal}>
            <div className={styles.logoutModalIcon}>
              <RiLogoutBoxFill aria-hidden="true" />
            </div>

            <div className={styles.logoutModalText}>
              <h2 id="logout-modal-title">Sair da conta?</h2>
              <p>Você precisa entrar novamente para acessar o painel.</p>
            </div>

            <div className={styles.logoutModalActions}>
              <button
                type="button"
                className={styles.logoutCancelButton}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.logoutConfirmButton}
                onClick={handleLogout}
              >
                Sim, sair
              </button>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
