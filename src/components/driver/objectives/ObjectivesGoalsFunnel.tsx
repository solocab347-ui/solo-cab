import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  Calendar,
  Clock,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Crown,
  Info,
  Rocket,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ObjectivesGoalsFunnelProps {
  driverId: string;
  driverUserId: string;
  onComplete: () => void;
}

type StepId = "intro" | "revenue" | "courses" | "hours" | "qr_clients" | "summary";

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Bienvenue" },
  { id: "revenue", label: "Revenu" },
  { id: "courses", label: "Courses" },
  { id: "hours", label: "Heures" },
  { id: "qr_clients", label: "Clients QR" },
  { id: "summary", label: "Validation" },
];

// Valeurs SoloCab de référence
const SOLOCAB_VALUES = {
  commission: 0.5, // €/course standard
  commissionShared: 0.25, // €/course partagée par chauffeur
  commissionSpontaneous: 0.8, // €/course spontanée
  averageFareParis: 25,
  averageFareProvince: 18,
  averageFareNational: 21,
  premiumPrice: 19.99, // €/mois
};

export function ObjectivesGoalsFunnel({
  driverId,
  driverUserId,
  onComplete,
}: ObjectivesGoalsFunnelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Valeurs par défaut réalistes (basées sur un chauffeur VTC moyen)
  const [revenueTarget, setRevenueTarget] = useState<number>(2500);
  const [coursesPerWeek, setCoursesPerWeek] = useState<number>(40);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [qrClientsPerMonth, setQrClientsPerMonth] = useState<number>(15);

  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // Calculs dérivés pour pédagogie
  const calculations = useMemo(() => {
    const monthlyCourses = coursesPerWeek * 4.33;
    const monthlyCommission = monthlyCourses * SOLOCAB_VALUES.commission;
    const avgFareNeeded = revenueTarget / monthlyCourses;
    const hourlyRate = revenueTarget / (hoursPerWeek * 4.33);
    const qrYearTotal = qrClientsPerMonth * 12;
    return {
      monthlyCourses: Math.round(monthlyCourses),
      monthlyCommission: monthlyCommission.toFixed(2),
      avgFareNeeded: avgFareNeeded.toFixed(2),
      hourlyRate: hourlyRate.toFixed(2),
      qrYearTotal,
    };
  }, [revenueTarget, coursesPerWeek, hoursPerWeek, qrClientsPerMonth]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Upsert objectifs mensuels
      const { error: objError } = await supabase
        .from("driver_objectives")
        .upsert(
          {
            driver_id: driverId,
            period_type: "monthly",
            revenue_target: revenueTarget,
            courses_target: calculations.monthlyCourses,
            hours_target: hoursPerWeek * 4.33,
            qr_scans_target: qrClientsPerMonth,
            new_clients_target: qrClientsPerMonth,
            rating_target: 4.7,
            is_active: true,
          },
          { onConflict: "driver_id,period_type" }
        );

      if (objError) throw objError;

      // Marquer comme complété
      const { error: drvError } = await supabase
        .from("drivers")
        .update({
          objectives_completed: true,
          onboarding_objectives_completed: true,
          objectives_data: {
            revenue_monthly: revenueTarget,
            courses_per_week: coursesPerWeek,
            hours_per_week: hoursPerWeek,
            qr_clients_per_month: qrClientsPerMonth,
            set_at: new Date().toISOString(),
          },
        })
        .eq("id", driverId);

      if (drvError) throw drvError;

      toast.success("Objectifs enregistrés ! 🎯", {
        description: "Ton tableau de bord va suivre ta progression en temps réel.",
      });
      onComplete();
    } catch (e: any) {
      console.error("[ObjectivesGoalsFunnel] save error", e);
      toast.error("Erreur lors de l'enregistrement", {
        description: e?.message || "Réessaie dans un instant",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
        <Card className="w-full max-w-2xl border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-card via-card to-card/95">
          {/* Header avec progress */}
          <div className="p-4 sm:p-6 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold">Mes Objectifs SoloCab</h2>
                  <p className="text-xs text-muted-foreground">
                    Étape {stepIndex + 1} / {STEPS.length} — {currentStep.label}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Obligatoire
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Body */}
          <div className="p-4 sm:p-8 min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {currentStep.id === "intro" && (
                  <IntroStep />
                )}

                {currentStep.id === "revenue" && (
                  <RevenueStep
                    value={revenueTarget}
                    onChange={setRevenueTarget}
                    avgFare={calculations.avgFareNeeded}
                    monthlyCourses={calculations.monthlyCourses}
                  />
                )}

                {currentStep.id === "courses" && (
                  <CoursesStep
                    value={coursesPerWeek}
                    onChange={setCoursesPerWeek}
                    monthlyCommission={calculations.monthlyCommission}
                    monthlyCourses={calculations.monthlyCourses}
                  />
                )}

                {currentStep.id === "hours" && (
                  <HoursStep
                    value={hoursPerWeek}
                    onChange={setHoursPerWeek}
                    hourlyRate={calculations.hourlyRate}
                  />
                )}

                {currentStep.id === "qr_clients" && (
                  <QrClientsStep
                    value={qrClientsPerMonth}
                    onChange={setQrClientsPerMonth}
                    yearTotal={calculations.qrYearTotal}
                  />
                )}

                {currentStep.id === "summary" && (
                  <SummaryStep
                    revenue={revenueTarget}
                    courses={coursesPerWeek}
                    hours={hoursPerWeek}
                    qr={qrClientsPerMonth}
                    monthlyCourses={calculations.monthlyCourses}
                    monthlyCommission={calculations.monthlyCommission}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="p-4 sm:p-6 border-t border-border/50 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={stepIndex === 0 || saving}
              className="text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>

            {currentStep.id !== "summary" ? (
              <Button onClick={handleNext} className="text-sm">
                Continuer
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-accent text-sm"
              >
                {saving ? (
                  "Enregistrement…"
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Valider mes objectifs
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   STEPS
   ============================================================ */

function IntroStep() {
  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
        <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2">
          Définissons tes objectifs ensemble
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          En 4 étapes rapides, tu vas fixer tes ambitions personnelles. Ton tableau
          de bord t'aidera à les suivre en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
        <ValueCard
          icon={Crown}
          title="0,50€"
          desc="par course"
          subtitle="Notre seule commission"
        />
        <ValueCard
          icon={Sparkles}
          title="100%"
          desc="de tes revenus"
          subtitle="Aucun pourcentage prélevé"
        />
        <ValueCard
          icon={Users}
          title="Tes clients"
          desc="t'appartiennent"
          subtitle="QR + carte personnelle"
        />
        <ValueCard
          icon={Crown}
          title="19,99€"
          desc="Premium /mois"
          subtitle="Optionnel — réseau VTC"
        />
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-left flex gap-2">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Pourquoi des objectifs ?</strong> Les
          chauffeurs qui se fixent des objectifs gagnent en moyenne 32 % de plus.
          Tu pourras les modifier à tout moment.
        </p>
      </div>
    </div>
  );
}

function RevenueStep({
  value,
  onChange,
  avgFare,
  monthlyCourses,
}: {
  value: number;
  onChange: (n: number) => void;
  avgFare: string;
  monthlyCourses: number;
}) {
  const presets = [1500, 2500, 3500, 5000];
  return (
    <div className="space-y-5">
      <StepHeader
        icon={TrendingUp}
        title="Quel revenu mensuel vises-tu ?"
        subtitle="Ton chiffre d'affaires brut, avant charges et carburant."
      />

      <div className="space-y-3">
        <Label htmlFor="revenue" className="text-sm font-medium">
          Objectif mensuel (€)
        </Label>
        <NumericInput
          id="revenue"
          value={value}
          onChange={(v) => onChange(typeof v === "number" ? v : 0)}
          min={0}
          step={100}
          className="text-2xl font-bold h-14 text-center"
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                value === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              {p.toLocaleString("fr-FR")}€
            </button>
          ))}
        </div>
      </div>

      <InfoBlock
        title="Pour atteindre ce revenu :"
        items={[
          { label: "Courses estimées /mois", value: `${monthlyCourses}` },
          { label: "Panier moyen requis", value: `${avgFare}€` },
          {
            label: "Commission SoloCab totale",
            value: `${(monthlyCourses * SOLOCAB_VALUES.commission).toFixed(2)}€`,
          },
        ]}
      />

      <ReferenceBlock
        title="Tarifs moyens VTC France"
        items={[
          { label: "Paris / Île-de-France", value: `~${SOLOCAB_VALUES.averageFareParis}€` },
          { label: "Grandes villes", value: `~${SOLOCAB_VALUES.averageFareNational}€` },
          { label: "Province", value: `~${SOLOCAB_VALUES.averageFareProvince}€` },
        ]}
      />
    </div>
  );
}

function CoursesStep({
  value,
  onChange,
  monthlyCommission,
  monthlyCourses,
}: {
  value: number;
  onChange: (n: number) => void;
  monthlyCommission: string;
  monthlyCourses: number;
}) {
  const presets = [20, 35, 50, 70];
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Calendar}
        title="Combien de courses par semaine ?"
        subtitle="Le rythme que tu souhaites maintenir pour atteindre ton objectif."
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Courses /semaine</Label>
        <NumericInput
          value={value}
          onChange={(v) => onChange(typeof v === "number" ? v : 0)}
          min={0}
          step={1}
          className="text-2xl font-bold h-14 text-center"
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                value === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              {p} courses
            </button>
          ))}
        </div>
      </div>

      <InfoBlock
        title="Sur le mois :"
        items={[
          { label: "Total courses", value: `${monthlyCourses}` },
          { label: "Frais SoloCab cumulés", value: `${monthlyCommission}€` },
          { label: "Coût par course", value: "0,50€" },
        ]}
      />

      <ReferenceBlock
        title="Frais SoloCab transparents"
        items={[
          { label: "Course standard", value: "0,50€" },
          { label: "Course partagée (par chauffeur)", value: "0,25€" },
          { label: "Course spontanée (NFC/QR)", value: "0,80€" },
        ]}
      />
    </div>
  );
}

function HoursStep({
  value,
  onChange,
  hourlyRate,
}: {
  value: number;
  onChange: (n: number) => void;
  hourlyRate: string;
}) {
  const presets = [25, 35, 45, 55];
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Clock}
        title="Combien d'heures par semaine ?"
        subtitle="Tes heures de service au volant — pour mesurer ton équilibre."
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Heures /semaine</Label>
        <NumericInput
          value={value}
          onChange={(v) => onChange(typeof v === "number" ? v : 0)}
          min={0}
          step={1}
          className="text-2xl font-bold h-14 text-center"
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                value === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              {p}h
            </button>
          ))}
        </div>
      </div>

      <InfoBlock
        title="Ton rythme :"
        items={[
          {
            label: "Total mensuel",
            value: `${Math.round(value * 4.33)}h`,
          },
          { label: "Taux horaire visé", value: `${hourlyRate}€/h` },
          {
            label: "Repos hebdo recommandé",
            value: "≥ 2 jours",
          },
        ]}
      />

      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs flex gap-2">
        <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Sécurité :</strong> la réglementation
          VTC limite à 10h de conduite/jour et impose 11h de repos consécutif.
        </p>
      </div>
    </div>
  );
}

function QrClientsStep({
  value,
  onChange,
  yearTotal,
}: {
  value: number;
  onChange: (n: number) => void;
  yearTotal: number;
}) {
  const presets = [5, 15, 30, 50];
  return (
    <div className="space-y-5">
      <StepHeader
        icon={QrCode}
        title="Combien de nouveaux clients via QR ?"
        subtitle="Ton objectif d'acquisition mensuel via ta plaque NFC et tes QR codes."
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Nouveaux clients QR /mois</Label>
        <NumericInput
          value={value}
          onChange={(v) => onChange(typeof v === "number" ? v : 0)}
          min={0}
          step={1}
          className="text-2xl font-bold h-14 text-center"
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                value === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              {p} clients
            </button>
          ))}
        </div>
      </div>

      <InfoBlock
        title="Sur 12 mois :"
        items={[
          { label: "Clients fidélisés", value: `${yearTotal}` },
          {
            label: "Si chacun fait 4 courses/an",
            value: `${yearTotal * 4} courses`,
          },
          {
            label: "Ton fichier client",
            value: "100 % à toi",
          },
        ]}
      />

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs flex gap-2">
        <QrCode className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Comment ?</strong> Plaque NFC dans ton
          véhicule, QR sur ta carte de visite, lien direct partagé après chaque
          course. Chaque scan = client fidélisé qui te recontacte directement.
        </p>
      </div>
    </div>
  );
}

function SummaryStep({
  revenue,
  courses,
  hours,
  qr,
  monthlyCourses,
  monthlyCommission,
}: {
  revenue: number;
  courses: number;
  hours: number;
  qr: number;
  monthlyCourses: number;
  monthlyCommission: string;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={CheckCircle2}
        title="Récapitulatif de tes objectifs"
        subtitle="Vérifie tes ambitions avant de valider."
      />

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={TrendingUp}
          label="Revenu /mois"
          value={`${revenue.toLocaleString("fr-FR")}€`}
        />
        <SummaryCard
          icon={Calendar}
          label="Courses /semaine"
          value={`${courses}`}
          sub={`${monthlyCourses}/mois`}
        />
        <SummaryCard
          icon={Clock}
          label="Heures /semaine"
          value={`${hours}h`}
          sub={`${Math.round(hours * 4.33)}h /mois`}
        />
        <SummaryCard
          icon={QrCode}
          label="Clients QR /mois"
          value={`${qr}`}
          sub={`${qr * 12}/an`}
        />
      </div>

      <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 rounded-lg p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Tes frais SoloCab estimés
        </p>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{monthlyCommission}€</span>
          <span className="text-xs text-muted-foreground">/mois</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Soit{" "}
          <strong className="text-foreground">
            {((parseFloat(monthlyCommission) / revenue) * 100).toFixed(2)}%
          </strong>{" "}
          de ton CA — versus 18 à 45 % chez la concurrence.
        </p>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Tu pourras modifier ces objectifs à tout moment dans <strong>Performance →
        Objectifs</strong>.
      </p>
    </div>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  desc,
  subtitle,
}: {
  icon: any;
  title: string;
  desc: string;
  subtitle: string;
}) {
  return (
    <div className="bg-muted/40 border border-border/60 rounded-lg p-3 text-left">
      <Icon className="w-4 h-4 text-primary mb-1" />
      <div className="text-base font-bold leading-tight">{title}</div>
      <div className="text-xs text-foreground/80">{desc}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
    </div>
  );
}

function InfoBlock({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{it.label}</span>
            <span className="font-bold text-foreground">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceBlock({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Info className="w-3 h-3 text-accent" />
        <p className="text-xs font-semibold text-accent">{title}</p>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{it.label}</span>
            <span className="font-medium text-foreground">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
