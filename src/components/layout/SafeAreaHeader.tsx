import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo-solocab.png";

interface SafeAreaHeaderProps {
  children?: ReactNode;
  showMobileMenu?: boolean;
  mobileMenuContent?: ReactNode;
  rightContent?: ReactNode;
  transparent?: boolean;
}

export const SafeAreaHeader = ({
  children,
  showMobileMenu = true,
  mobileMenuContent,
  rightContent,
  transparent = false,
}: SafeAreaHeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Header with iOS safe area padding */}
      <header
        className={`sticky top-0 z-50 border-b border-border/50 backdrop-blur-lg ${
          transparent ? "bg-transparent" : "bg-background/95"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between min-h-[56px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={logo}
              alt="SoloCab"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
            />
          </Link>

          {/* Center content (desktop nav) */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            {children}
          </div>

          {/* Right content + Mobile menu toggle */}
          <div className="flex items-center gap-2">
            {rightContent}

            {showMobileMenu && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {showMobileMenu && isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/98 backdrop-blur-md md:hidden"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 56px)",
          }}
        >
          <div className="container mx-auto px-4 py-6">
            {mobileMenuContent || children}
          </div>
        </div>
      )}
    </>
  );
};

export default SafeAreaHeader;
