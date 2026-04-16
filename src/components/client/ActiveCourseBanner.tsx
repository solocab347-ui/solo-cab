import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ActiveCourse } from "@/hooks/useActiveClientCourse";

const STATUS_LABEL: Record<string, string> = {
  pending: "Recherche d'un chauffeur",
  accepted: "Chauffeur confirmé",
  driver_approaching: "Chauffeur en approche",
  driver_arrived: "Chauffeur arrivé",
  in_progress: "Course en cours",
};

interface Props {
  course: ActiveCourse;
  onOpen: () => void;
}

export function ActiveCourseBanner({ course, onOpen }: Props) {
  const price = course.final_payment_amount || course.guest_estimated_price;
  const statusLabel = STATUS_LABEL[course.status] || course.status;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className="border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={onOpen}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
          >
            <Navigation className="h-5 w-5 text-primary" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm text-foreground truncate">{statusLabel}</p>
              <Badge variant="default" className="h-4 text-[9px] px-1.5">LIVE</Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{course.pickup_address.split(",")[0]}</span>
              <span className="text-primary mx-0.5">→</span>
              <span className="truncate">{course.destination_address.split(",")[0]}</span>
            </div>
          </div>
          {price && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground">{price.toFixed(2)}€</p>
            </div>
          )}
          <Button size="sm" variant="ghost" className="shrink-0 px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
