import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/useLocale";
import { SUPPORTED_LANGUAGES, type Locale } from "@/lib/i18n";

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'header';
  showLabel?: boolean;
}

export const LanguageSelector = ({ variant = 'default', showLabel = true }: LanguageSelectorProps) => {
  const { locale, setLocale } = useLocale();

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === locale) || SUPPORTED_LANGUAGES[0];

  // Style header similaire aux autres icônes (NotificationBell, RGPD, etc.)
  const headerClassName = "h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={variant === 'compact' || variant === 'header' ? 'icon' : 'sm'}
          className={variant === 'header' ? headerClassName : "gap-2"}
        >
          <Globe className={variant === 'header' ? "w-4 h-4 sm:w-5 sm:h-5" : "h-4 w-4"} />
          {variant === 'default' && showLabel && (
            <span className="hidden sm:inline">{currentLang.flag} {currentLang.nativeLabel}</span>
          )}
          {(variant === 'compact' || variant === 'header') && (
            <span className="sr-only">{currentLang.nativeLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={`flex items-center gap-2 ${locale === lang.code ? 'bg-muted' : ''}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.nativeLabel}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
