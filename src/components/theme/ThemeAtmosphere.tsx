import styles from "./ThemeAtmosphere.module.css";

/** Decorative CSS atmosphere: no client state, input interception or hydration dependency. */
export default function ThemeAtmosphere() {
  return <div className={styles.atmosphere} aria-hidden="true" data-dark-mode="preserve">
    <span className={styles.halo} />
    <span className={styles.wave} />
  </div>;
}
