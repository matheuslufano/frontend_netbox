// app/layout.js
import "@/styles/globals.css";

import AppShell from "@/components/layout/AppShell";
import ThemeProvider from "@/components/theme/ThemeProvider";
import DynamicDarkMode from "@/components/theme/DynamicDarkMode";
import SystemNotificationProvider from "@/components/SystemNotificationProvider";

const themeScript = `(function(){try{var saved=localStorage.getItem('netbox-theme');var theme=saved==='dark'||saved==='light'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SystemNotificationProvider>
            <DynamicDarkMode />
            <AppShell>{children}</AppShell>
          </SystemNotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
