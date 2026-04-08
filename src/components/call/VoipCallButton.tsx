import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoipCallButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'default' | 'icon' | 'compact';
  className?: string;
}

export function VoipCallButton({
  onClick,
  label = 'Appeler',
  disabled = false,
  variant = 'default',
  className,
}: VoipCallButtonProps) {
  if (variant === 'icon') {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        size="icon"
        variant="ghost"
        className={cn('h-9 w-9 rounded-full hover:bg-green-500/10 text-green-600', className)}
        title={label}
      >
        <Phone className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={onClick}
        disabled={disabled}
        size="sm"
        variant="outline"
        className={cn('gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10', className)}
      >
        <Phone className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'gap-2 bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20',
        className
      )}
    >
      <Phone className="h-4 w-4" />
      {label}
    </Button>
  );
}
