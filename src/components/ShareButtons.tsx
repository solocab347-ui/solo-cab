import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonsProps {
  title: string;
  message: string;
  url?: string;
}

const ShareButtons = ({ title, message, url }: ShareButtonsProps) => {
  const shareUrl = url || window.location.href;
  
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${message}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast.success("Partage WhatsApp ouvert");
  };

  const handleSMS = () => {
    const text = encodeURIComponent(`${message}\n\n${shareUrl}`);
    window.location.href = `sms:?body=${text}`;
    toast.success("Application SMS ouverte");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${message}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Application email ouverte");
  };

  const handleFacebook = () => {
    const shareUrlEncoded = encodeURIComponent(shareUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`,
      "_blank"
    );
    toast.success("Partage Facebook ouvert");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Lien copié dans le presse-papier");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSMS}>
          <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
          SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail}>
          <Mail className="w-4 h-4 mr-2 text-orange-500" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebook}>
          <svg
            className="w-4 h-4 mr-2 text-blue-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Share2 className="w-4 h-4 mr-2" />
          Copier le lien
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButtons;
