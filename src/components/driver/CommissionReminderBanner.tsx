import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  AlertTriangle,
  Euro,
  Building2,
  Users,
  ChevronRight,
  X
} from "lucide-react";
import { CommissionReminder } from "@/hooks/useCommissionReminders";
import { CommissionReminderPopup } from "./CommissionReminderPopup";

interface CommissionReminderBannerProps {
  reminders: CommissionReminder[];
  onMarkAsPaid: (reminderId: string, partnershipId: string, type: 'fleet' | 'partner') => Promise<void>;
  onDismiss: (reminderId: string) => void;
}

export function CommissionReminderBanner({
  reminders,
  onMarkAsPaid,
  onDismiss
}: CommissionReminderBannerProps) {
  const [selectedReminder, setSelectedReminder] = useState<CommissionReminder | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [autoShowDone, setAutoShowDone] = useState(false);

  // Auto-show popup for first overdue reminder on mount
  useEffect(() => {
    if (!autoShowDone && reminders.length > 0) {
      const overdueReminder = reminders.find(r => r.isOverdue);
      if (overdueReminder) {
        setSelectedReminder(overdueReminder);
        setShowPopup(true);
      }
      setAutoShowDone(true);
    }
  }, [reminders, autoShowDone]);

  if (reminders.length === 0) return null;

  const overdueCount = reminders.filter(r => r.isOverdue).length;
  const totalDue = reminders.reduce((sum, r) => sum + r.amount, 0);

  const handleReminderClick = (reminder: CommissionReminder) => {
    setSelectedReminder(reminder);
    setShowPopup(true);
  };

  return (
    <>
      {/* Summary banner */}
      <Card className={`border-2 ${overdueCount > 0 ? 'border-destructive/50 bg-destructive/5' : 'border-warning/50 bg-warning/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {overdueCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Bell className="w-5 h-5 text-warning animate-pulse" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">
                {overdueCount > 0 
                  ? `${overdueCount} commission(s) en retard !`
                  : `${reminders.length} commission(s) à reverser`
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                Total: <strong>{totalDue.toFixed(2)} €</strong>
              </p>
            </div>
            <Badge variant={overdueCount > 0 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
              {reminders.length}
            </Badge>
          </div>

          {/* Reminder cards */}
          <div className="space-y-2">
            {reminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  reminder.isOverdue 
                    ? 'bg-destructive/10 hover:bg-destructive/20 border border-destructive/30' 
                    : 'bg-warning/10 hover:bg-warning/20 border border-warning/30'
                }`}
                onClick={() => handleReminderClick(reminder)}
              >
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={reminder.partnerPhoto} />
                  <AvatarFallback className="text-xs">
                    {reminder.partnerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{reminder.partnerName}</p>
                    {reminder.type === 'fleet' ? (
                      <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Échéance: {format(new Date(reminder.dueDate), "dd MMM", { locale: fr })}
                    {reminder.isOverdue && (
                      <span className="text-destructive ml-1">
                        ({reminder.daysSinceDue}j de retard)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${reminder.isOverdue ? 'text-destructive' : 'text-warning'}`}>
                    {reminder.amount.toFixed(2)} €
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}

            {reminders.length > 3 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm text-muted-foreground"
                onClick={() => {
                  setSelectedReminder(reminders[3]);
                  setShowPopup(true);
                }}
              >
                + {reminders.length - 3} autre(s) commission(s)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popup */}
      <CommissionReminderPopup
        reminder={selectedReminder}
        open={showPopup}
        onClose={() => setShowPopup(false)}
        onMarkAsPaid={onMarkAsPaid}
        onDismiss={onDismiss}
      />
    </>
  );
}
