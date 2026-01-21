import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PWABannerContextValue {
  isBannerVisible: boolean;
  setBannerVisible: (visible: boolean) => void;
}

const PWABannerContext = createContext<PWABannerContextValue>({
  isBannerVisible: false,
  setBannerVisible: () => {},
});

export const usePWABanner = () => useContext(PWABannerContext);

interface PWABannerProviderProps {
  children: ReactNode;
}

export const PWABannerProvider = ({ children }: PWABannerProviderProps) => {
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  return (
    <PWABannerContext.Provider value={{ isBannerVisible, setBannerVisible: setIsBannerVisible }}>
      {/* Ajouter une classe CSS globale quand la bannière est visible */}
      <div className={isBannerVisible ? "pwa-banner-visible" : ""}>
        {children}
      </div>
    </PWABannerContext.Provider>
  );
};
