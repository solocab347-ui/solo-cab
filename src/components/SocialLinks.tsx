import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Linkedin, Instagram } from "lucide-react";
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
