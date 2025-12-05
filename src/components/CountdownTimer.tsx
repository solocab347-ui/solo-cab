import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate, className = "" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-gradient-to-br from-premium/20 to-premium/10 border border-premium/30 rounded-lg px-3 py-2 min-w-[60px] backdrop-blur-sm">
        <span className="text-2xl md:text-3xl font-bold text-premium tabular-nums">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-premium">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Offre valable encore :</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <TimeBlock value={timeLeft.days} label="Jours" />
        <span className="text-2xl font-bold text-premium/60 -mt-5">:</span>
        <TimeBlock value={timeLeft.hours} label="Heures" />
        <span className="text-2xl font-bold text-premium/60 -mt-5">:</span>
        <TimeBlock value={timeLeft.minutes} label="Min" />
        <span className="text-2xl font-bold text-premium/60 -mt-5">:</span>
        <TimeBlock value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
};

export default CountdownTimer;
