import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, Send, Inbox, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PartnershipStatus = 'none' | 'outgoing_pending' | 'incoming_pending' | 'active' | 'rejected';

interface PartnershipStatusBadgeProps {
  status: PartnershipStatus;
  className?: string;
  compact?: boolean;
}

export function PartnershipStatusBadge({ status, className, compact = false }: PartnershipStatusBadgeProps) {
  if (status === 'none') return null;

  const configs = {
    outgoing_pending: {
      label: compact ? 'En attente' : 'Demande envoyée - En attente de réponse',
      icon: Send,
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    },
    incoming_pending: {
      label: compact ? 'À répondre' : 'Ce chauffeur vous a envoyé une demande',
      icon: Inbox,
      variant: 'secondary' as const,
      className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
    },
    active: {
      label: compact ? 'Partenaire' : 'Partenariat actif',
      icon: CheckCircle2,
      variant: 'secondary' as const,
      className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
    },
    rejected: {
      label: compact ? 'Refusé' : 'Demande refusée',
      icon: XCircle,
      variant: 'secondary' as const,
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={cn('flex items-center gap-1.5 font-medium', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs">{config.label}</span>
    </Badge>
  );
}

interface PartnershipStatusMessageProps {
  status: PartnershipStatus;
  partnerName?: string;
  className?: string;
}

export function PartnershipStatusMessage({ status, partnerName, className }: PartnershipStatusMessageProps) {
  if (status === 'none') return null;

  const messages = {
    outgoing_pending: `Votre demande de partenariat a été envoyée${partnerName ? ` à ${partnerName}` : ''}. En attente de réponse.`,
    incoming_pending: `${partnerName || 'Ce chauffeur'} vous a déjà envoyé une demande de partenariat. Consultez vos demandes reçues pour y répondre.`,
    active: `Vous avez déjà un partenariat actif${partnerName ? ` avec ${partnerName}` : ''}.`,
    rejected: `La demande de partenariat a été refusée.`,
  };

  const colors = {
    outgoing_pending: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
    incoming_pending: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800',
    active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  };

  const icons = {
    outgoing_pending: Send,
    incoming_pending: Inbox,
    active: CheckCircle2,
    rejected: XCircle,
  };

  const Icon = icons[status];

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border text-sm',
      colors[status],
      className
    )}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p>{messages[status]}</p>
    </div>
  );
}
