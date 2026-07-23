import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/common.json";
import es from "./locales/es/common.json";
import lv from "./locales/lv/common.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        es: { common: es },
        lv: { common: lv },
      },
      lng: "en", // always start in English — matches SSR, no auto-detection
      fallbackLng: "en",
      supportedLngs: ["en", "es", "lv"],
      defaultNS: "common",
      interpolation: { escapeValue: false },
    });
}

export default i18n;