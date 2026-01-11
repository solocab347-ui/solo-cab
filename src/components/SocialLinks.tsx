import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Linkedin, Instagram, Youtube, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksProps {
  className?: string;
  iconSize?: number;
  variant?: "default" | "compact";
}

// Icône TikTok personnalisée (pas disponible dans lucide-react)
const TikTokIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SocialLinks = ({ className, iconSize = 24, variant = "default" }: SocialLinksProps) => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("social_links")
        .select("platform, url")
        .eq("is_active", true)
        .not("url", "is", null)
        .order("display_order");

      if (error) throw error;

      setSocialLinks(data || []);
    } catch (error) {
      console.error("Error fetching social links:", error);
    }
  };

  const getIcon = (platform: string) => {
    const size = iconSize;
    switch (platform.toLowerCase()) {
      case "facebook":
        return <Facebook size={size} />;
      case "linkedin":
        return <Linkedin size={size} />;
      case "instagram":
        return <Instagram size={size} />;
      case "tiktok":
        return <TikTokIcon size={size} />;
      case "youtube":
        return <Youtube size={size} />;
      case "twitter":
        return <Twitter size={size} />;
      default:
        return null;
    }
  };

  if (socialLinks.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        variant === "compact" && "gap-3",
        className
      )}
    >
      {socialLinks.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          aria-label={link.platform}
        >
          {getIcon(link.platform)}
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;
