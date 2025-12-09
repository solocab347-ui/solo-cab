import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navigation, MapPin } from "lucide-react";
import { getNavigationOptions, NavigationDestination } from "@/lib/navigationApp";

interface NavigationSelectorProps {
  destination: NavigationDestination;
  origin?: NavigationDestination;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function NavigationSelector({
  destination,
  origin,
  label = "Naviguer",
  variant = "default",
  size = "default",
  className,
}: NavigationSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const options = getNavigationOptions(destination, origin);
  
  const handleSelect = (url: string) => {
    window.open(url, '_blank');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Navigation className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Choisir une application
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Destination : {destination.address}
          </p>
          {options.map((option) => (
            <Button
              key={option.app}
              variant="outline"
              className="w-full justify-start text-lg py-6"
              onClick={() => handleSelect(option.url)}
            >
              <span className="text-2xl mr-3">{option.icon}</span>
              {option.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
