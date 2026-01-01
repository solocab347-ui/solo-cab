import { useEffect } from 'react';
import { initializeLocale } from '@/lib/i18n';
import { LanguageSelector } from '@/components/LanguageSelector';

interface GlobalLanguageSelectorProps {
  position?: 'top-right' | 'top-left';
}

/**
 * Component that initializes locale and provides a fixed language selector
 * Should be placed in App.tsx or main layouts
 */
export const GlobalLanguageSelector = ({ position = 'top-right' }: GlobalLanguageSelectorProps) => {
  // Initialize locale on mount
  useEffect(() => {
    initializeLocale();
  }, []);

  const positionClasses = position === 'top-right' 
    ? 'top-4 right-4' 
    : 'top-4 left-4';

  return (
    <div className={`fixed ${positionClasses} z-[100]`}>
      <LanguageSelector variant="compact" />
    </div>
  );
};

export default GlobalLanguageSelector;
