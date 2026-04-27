import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
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
  Car,
  Fuel,
  Wrench,
  ShieldCheck,
  Receipt,
  Building2,
  Wallet,
  Hand,
  UserPlus,
  Heart,
  Route,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEFAULT_PLATFORMS } from "./types";

interface ObjectivesGoalsFunnelProps {
  driverId: string;
  driverUserId: string;
  onComplete: () => void;
}

type StepId =
  | "intro"
  | "revenue"
  | "activity"
  | "planning"
  | "platforms"
  | "expenses"
  | "liberation"
  | "summary";

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Bienvenue" },
  { id: "revenue", label: "Revenu" },
  { id: "activity", label: "Activité" },
  { id: "planning", label: "Planning" },
  { id: "platforms", label: "Plateformes" },
  { id: "expenses", label: "Dépenses" },
  { id: "liberation", label: "Libération" },
  { id: "summary", label: "Validation" },
];

// Valeurs SoloCab de référence
const SOLOCAB_VALUES = {
  commission: 0.5,
  commissionShared: 0.25,
  commissionSpontaneous: 0.8,
  averageFareParis: 25,
  averageFareProvince: 18,
  averageFareNational: 21,
  premiumPrice: 19.99,
};

// Jours (compat ObjectivesEditor)
const DAYS = [
  { id: "lundi", label: "L", full: "Lundi", weight: 0.7, index: 1 },
  { id: "mardi", label: "M", full: "Mardi", weight: 0.85, index: 2 },
  { id: "mercredi", label: "M", full: "Mercredi", weight: 0.95, index: 3 },
  { id: "jeudi", label: "J", full: "Jeudi", weight: 0.95, index: 4 },
  { id: "vendredi", label: "V", full: "Vendredi", weight: 1.15, index: 5 },
  { id: "samedi", label: "S", full: "Samedi", weight: 1.2, index: 6 },
  { id: "dimanche", label: "D", full: "Dimanche", weight: 1.2, index: 0 },
];

// Postes de dépenses VTC France
const EXPENSE_PRESETS = [
  { key: "fuel", label: "Carburant", icon: Fuel, default: 600, max: 1500 },
  { key: "insurance", label: "Assurance pro VTC", icon: ShieldCheck, default: 130, max: 300 },
  { key: "vehicle_lease", label: "Location / leasing", icon: Car, default: 0, max: 1200 },
  { key: "maintenance", label: "Entretien", icon: Wrench, default: 100, max: 400 },
  { key: "licenses", label: "Licences / redevances", icon: Receipt, default: 50, max: 200 },
  { key: "accountant", label: "Comptable / autres", icon: Building2, default: 100, max: 400 },
] as const;

type ExpenseKey = (typeof EXPENSE_PRESETS)[number]["key"];

export function ObjectivesGoalsFunnel({
  driverId,
  onComplete,
}: ObjectivesGoalsFunnelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Étape 2 — Revenu
  const [targetRevenue, setTargetRevenue] = useState(2500);

  // Étape 3 — Activité
  const [targetCourses, setTargetCourses] = useState(150); // mensuel
  const [targetKm, setTargetKm] = useState(2500); // mensuel

  // Étape 4 — Planning
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
  ]);
  const [hoursPerDay, setHoursPerDay] = useState(8);

  // Étape 5 — Plateformes
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "Uber",
    "Bolt",
  ]);
  const [platformPercentage, setPlatformPercentage] = useState(80); // % du CA actuel sur plateformes
  const [currentMonthlyRevenue, setCurrentMonthlyRevenue] = useState(2000);

  // Étape 6 — Dépenses
  const [expenses, setExpenses] = useState<Record<ExpenseKey, number>>(() => {
    const init = {} as Record<ExpenseKey, number>;
    EXPENSE_PRESETS.forEach((e) => {
      init[e.key] = e.default;
    });
    return init;
  });

  // Étape 7 — Libération / acquisition
  const [cardsTarget, setCardsTarget] = useState(60);
  const [qrScansTarget, setQrScansTarget] = useState(30);
  const [directClientsTarget, setDirectClientsTarget] = useState(8);
  const [independencePctTarget, setIndependencePctTarget] = useState(30);

  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // ===== Calculs dérivés =====
  const calc = useMemo(() => {
    const weeklyRevenue = Math.round(targetRevenue / 4);
    const monthlyHours = hoursPerDay * selectedDays.length * 4;
    const hourlyRate = monthlyHours > 0 ? targetRevenue / monthlyHours : 0;
    const avgFare = targetCourses > 0 ? targetRevenue / targetCourses : 0;
    const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
    const solocabFees = targetCourses * SOLOCAB_VALUES.commission;
    const netRevenue = targetRevenue - totalExpenses - solocabFees;
    const netMarginPct = targetRevenue > 0 ? (netRevenue / targetRevenue) * 100 : 0;
    const solocabPercentage = 100 - platformPercentage;

    // Daily targets selon poids des jours
    const dayObjs = DAYS.filter((d) => selectedDays.includes(d.id));
    const totalWeight = dayObjs.reduce((s, d) => s + d.weight, 0) || 1;
    const dailyTargets: Record<string, { target: number; weight: number }> = {};
    dayObjs.forEach((d) => {
      dailyTargets[d.id] = {
        target: Math.round(weeklyRevenue * (d.weight / totalWeight)),
        weight: d.weight,
      };
    });

    return {
      weeklyRevenue,
      monthlyHours,
      hourlyRate,
      avgFare,
      totalExpenses,
      solocabFees,
      netRevenue,
      netMarginPct,
      solocabPercentage,
      dailyTargets,
    };
  }, [
    targetRevenue,
    targetCourses,
    hoursPerDay,
    selectedDays,
    expenses,
    platformPercentage,
  ]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
  };
  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const toggleDay = (id: string) => {
    setSelectedDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const togglePlatform = (name: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  // ===== PERSISTANCE FINALE =====
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Construire objectives_data au format attendu par l'éditeur dashboard
      const objectivesData = {
        // Revenu
        target_monthly_revenue: targetRevenue,
        target_weekly_revenue: calc.weeklyRevenue,
        target_monthly_courses: targetCourses,
        target_monthly_km: targetKm,
        // Planning
        work_hours_per_day: hoursPerDay,
        work_days_per_week: selectedDays.length,
        selected_work_days: selectedDays,
        daily_targets: calc.dailyTargets,
        estimated_hourly_target: Math.round(calc.hourlyRate),
        // Mix plateformes
        platform_percentage: platformPercentage,
        solocab_percentage: calc.solocabPercentage,
        current_monthly_revenue: currentMonthlyRevenue,
        // Acquisition
        target_direct_clients: directClientsTarget,
        // Dépenses (nouveau)
        monthly_expenses: {
          ...expenses,
          total: calc.totalExpenses,
        },
        target_net_revenue: Math.round(calc.netRevenue),
        // Audit
        goals_completed_at: new Date().toISOString(),
        source: "goals_funnel_v2",
      };

      // 2. Upsert des 4 périodes driver_objectives
      const multipliers = {
        daily: { revenue: 1 / 22, clients: 1 / 22, hours: 1, courses: 1 / 22, km: 1 / 22 },
        weekly: {
          revenue: 1 / 4,
          clients: 1 / 4,
          hours: selectedDays.length,
          courses: 1 / 4,
          km: 1 / 4,
        },
        monthly: {
          revenue: 1,
          clients: 1,
          hours: selectedDays.length * 4,
          courses: 1,
          km: 1,
        },
        yearly: {
          revenue: 12,
          clients: 12,
          hours: selectedDays.length * 4 * 12,
          courses: 12,
          km: 12,
        },
      } as const;

      const objectivesRows = (
        ["daily", "weekly", "monthly", "yearly"] as const
      ).map((period) => {
        const m = multipliers[period];
        return {
          driver_id: driverId,
          period_type: period,
          revenue_target: Math.round(targetRevenue * m.revenue),
          new_clients_target: Math.max(1, Math.round(directClientsTarget * m.clients)),
          hours_target: Math.round(hoursPerDay * m.hours),
          courses_target: Math.max(1, Math.round(targetCourses * m.courses)),
          km_target: Math.round(targetKm * m.km),
          rating_target: 4.7,
          cards_proposed_target: Math.max(0, Math.round(cardsTarget * m.clients)),
          qr_scans_target: Math.max(0, Math.round(qrScansTarget * m.clients)),
          direct_clients_target: Math.max(0, Math.round(directClientsTarget * m.clients)),
          independence_percentage_target: independencePctTarget,
          is_active: true,
        };
      });

      // 3. Schedule rows
      const scheduleRows = DAYS.map((d) => ({
        driver_id: driverId,
        day_of_week: d.index,
        is_working_day: selectedDays.includes(d.id),
        target_hours: selectedDays.includes(d.id) ? hoursPerDay : 0,
        start_time: selectedDays.includes(d.id) ? "08:00:00" : null,
        end_time: selectedDays.includes(d.id)
          ? `${String(8 + hoursPerDay).padStart(2, "0")}:00:00`
          : null,
      }));

      // 4. Plateformes — récupérer existantes pour ne pas dupliquer
      const { data: existingPlatforms } = await supabase
        .from("driver_platforms")
        .select("platform_name")
        .eq("driver_id", driverId);
      const existingNames = new Set(
        (existingPlatforms || []).map((p) => p.platform_name)
      );
      const platformsToInsert = selectedPlatforms
        .filter((name) => !existingNames.has(name))
        .map((name, idx) => {
          const def = DEFAULT_PLATFORMS.find((p) => p.name === name);
          return {
            driver_id: driverId,
            platform_name: name,
            platform_icon: def?.icon || "car",
            display_order: idx,
            is_active: true,
          };
        });

      // 5. Exécution parallèle
      const ops: Promise<any>[] = [
        supabase
          .from("drivers")
          .update({
            objectives_completed: true,
            onboarding_objectives_completed: true,
            objectives_data: JSON.parse(JSON.stringify(objectivesData)),
          })
          .eq("id", driverId),
        supabase
          .from("driver_objectives")
          .upsert(objectivesRows, { onConflict: "driver_id,period_type" }),
        supabase
          .from("driver_work_schedules")
          .upsert(scheduleRows, { onConflict: "driver_id,day_of_week" }),
      ];
      if (platformsToInsert.length > 0) {
        ops.push(supabase.from("driver_platforms").insert(platformsToInsert));
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw firstError;

      toast.success("Objectifs enregistrés ! 🎯", {
        description: "Ton suivi de performance démarre maintenant.",
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

  const canProceed = useMemo(() => {
    switch (currentStep.id) {
      case "revenue":
        return targetRevenue > 0;
      case "activity":
        return targetCourses > 0 && targetKm > 0;
      case "planning":
        return selectedDays.length > 0 && hoursPerDay > 0;
      case "platforms":
        return true; // plateformes optionnelles
      default:
        return true;
    }
  }, [currentStep.id, targetRevenue, targetCourses, targetKm, selectedDays, hoursPerDay]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
        <Card className="w-full max-w-2xl border-2 border-primary/20 shadow-2xl bg-gradient-to-br from-card via-card to-card/95">
          {/* Header avec progress */}
          <div className="p-4 sm:p-6 border-b border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate">
                    Mes Objectifs SoloCab
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    Étape {stepIndex + 1}/{STEPS.length} — {currentStep.label}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                Obligatoire
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 min-h-[440px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {currentStep.id === "intro" && <IntroStep />}

                {currentStep.id === "revenue" && (
                  <RevenueStep
                    value={targetRevenue}
                    onChange={setTargetRevenue}
                    weekly={calc.weeklyRevenue}
                  />
                )}

                {currentStep.id === "activity" && (
                  <ActivityStep
                    courses={targetCourses}
                    onCoursesChange={setTargetCourses}
                    km={targetKm}
                    onKmChange={setTargetKm}
                    avgFare={calc.avgFare}
                    solocabFees={calc.solocabFees}
                  />
                )}

                {currentStep.id === "planning" && (
                  <PlanningStep
                    days={selectedDays}
                    onToggleDay={toggleDay}
                    hours={hoursPerDay}
                    onHoursChange={setHoursPerDay}
                    monthlyHours={calc.monthlyHours}
                    hourlyRate={calc.hourlyRate}
                  />
                )}

                {currentStep.id === "platforms" && (
                  <PlatformsStep
                    selected={selectedPlatforms}
                    onToggle={togglePlatform}
                    platformPct={platformPercentage}
                    onPctChange={setPlatformPercentage}
                    currentRevenue={currentMonthlyRevenue}
                    onCurrentRevenueChange={setCurrentMonthlyRevenue}
                  />
                )}

                {currentStep.id === "expenses" && (
                  <ExpensesStep
                    expenses={expenses}
                    onChange={setExpenses}
                    total={calc.totalExpenses}
                    solocabFees={calc.solocabFees}
                    targetRevenue={targetRevenue}
                    netRevenue={calc.netRevenue}
                    netMarginPct={calc.netMarginPct}
                  />
                )}

                {currentStep.id === "liberation" && (
                  <LiberationStep
                    cards={cardsTarget}
                    onCardsChange={setCardsTarget}
                    scans={qrScansTarget}
                    onScansChange={setQrScansTarget}
                    directs={directClientsTarget}
                    onDirectsChange={setDirectClientsTarget}
                    indepPct={independencePctTarget}
                    onIndepPctChange={setIndependencePctTarget}
                  />
                )}

                {currentStep.id === "summary" && (
                  <SummaryStep
                    revenue={targetRevenue}
                    courses={targetCourses}
                    km={targetKm}
                    days={selectedDays.length}
                    hours={hoursPerDay}
                    expenses={calc.totalExpenses}
                    solocabFees={calc.solocabFees}
                    netRevenue={calc.netRevenue}
                    netMarginPct={calc.netMarginPct}
                    platforms={selectedPlatforms}
                    cards={cardsTarget}
                    scans={qrScansTarget}
                    directs={directClientsTarget}
                    indepPct={independencePctTarget}
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
              <Button onClick={handleNext} disabled={!canProceed} className="text-sm">
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
          Cap sur ton indépendance
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          En 7 étapes rapides, on définit ensemble ton revenu, ton planning, tes
          plateformes, tes dépenses et ton plan d'acquisition clients. Tu pourras
          tout modifier ensuite.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
          icon={Heart}
          title="19,99€"
          desc="Premium /mois"
          subtitle="Optionnel — réseau VTC"
        />
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-left flex gap-2">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">L'objectif n'est pas le CA</strong>,
          c'est ton indépendance. Chaque scan QR = un client qui revient sans
          intermédiaire. Tu vises 30% de revenus directs ? On t'y emmène.
        </p>
      </div>
    </div>
  );
}

function RevenueStep({
  value,
  onChange,
  weekly,
}: {
  value: number;
  onChange: (n: number) => void;
  weekly: number;
}) {
  const presets = [1500, 2500, 3500, 5000];
  return (
    <div className="space-y-5">
      <StepHeader
        icon={TrendingUp}
        title="Quel revenu mensuel vises-tu ?"
        subtitle="Ton chiffre d'affaires brut total (toutes plateformes incluses)."
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
            <PresetChip key={p} active={value === p} onClick={() => onChange(p)}>
              {p.toLocaleString("fr-FR")}€
            </PresetChip>
          ))}
        </div>
      </div>

      <InfoBlock
        title="Découpage automatique :"
        items={[
          { label: "Hebdomadaire", value: `${weekly.toLocaleString("fr-FR")}€` },
          {
            label: "Annuel",
            value: `${(value * 12).toLocaleString("fr-FR")}€`,
          },
        ]}
      />

      <ReferenceBlock
        title="Tarifs moyens VTC France"
        items={[
          { label: "Paris / IDF", value: `~${SOLOCAB_VALUES.averageFareParis}€` },
          { label: "Grandes villes", value: `~${SOLOCAB_VALUES.averageFareNational}€` },
          { label: "Province", value: `~${SOLOCAB_VALUES.averageFareProvince}€` },
        ]}
      />
    </div>
  );
}

function ActivityStep({
  courses,
  onCoursesChange,
  km,
  onKmChange,
  avgFare,
  solocabFees,
}: {
  courses: number;
  onCoursesChange: (n: number) => void;
  km: number;
  onKmChange: (n: number) => void;
  avgFare: number;
  solocabFees: number;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Calendar}
        title="Quel volume d'activité ?"
        subtitle="Le nombre de courses et de kilomètres pour atteindre ton revenu."
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Courses /mois</Label>
          <NumericInput
            value={courses}
            onChange={(v) => onCoursesChange(typeof v === "number" ? v : 0)}
            min={0}
            step={5}
            className="text-xl font-bold h-12 text-center"
          />
          <p className="text-[10px] text-muted-foreground text-center">
            ≈ {Math.round(courses / 4)} /semaine
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Kilomètres /mois</Label>
          <NumericInput
            value={km}
            onChange={(v) => onKmChange(typeof v === "number" ? v : 0)}
            min={0}
            step={100}
            className="text-xl font-bold h-12 text-center"
          />
          <p className="text-[10px] text-muted-foreground text-center">
            ≈ {Math.round(km / courses) || 0} km/course
          </p>
        </div>
      </div>

      <InfoBlock
        title="Ce que ça implique :"
        items={[
          { label: "Panier moyen requis", value: `${avgFare.toFixed(2)}€` },
          {
            label: "Frais SoloCab cumulés",
            value: `${solocabFees.toFixed(2)}€`,
          },
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

function PlanningStep({
  days,
  onToggleDay,
  hours,
  onHoursChange,
  monthlyHours,
  hourlyRate,
}: {
  days: string[];
  onToggleDay: (id: string) => void;
  hours: number;
  onHoursChange: (n: number) => void;
  monthlyHours: number;
  hourlyRate: number;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Clock}
        title="Quel rythme de travail ?"
        subtitle="Tes jours et heures de service — pour mesurer ton équilibre."
      />

      <div className="space-y-3">
        <Label className="text-sm font-medium">Jours travaillés</Label>
        <div className="flex gap-1.5 sm:gap-2">
          {DAYS.map((d) => {
            const active = days.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => onToggleDay(d.id)}
                className={cn(
                  "flex-1 h-12 rounded-lg border-2 font-bold text-sm transition-all",
                  active
                    ? "bg-primary text-primary-foreground border-primary scale-105"
                    : "bg-muted/30 border-border hover:bg-muted"
                )}
                aria-label={d.full}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {days.length} jour{days.length > 1 ? "s" : ""} /semaine
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Heures par jour</Label>
          <span className="text-lg font-bold text-primary">{hours}h</span>
        </div>
        <Slider
          value={[hours]}
          onValueChange={(v) => onHoursChange(v[0])}
          min={2}
          max={12}
          step={1}
        />
      </div>

      <InfoBlock
        title="Ton volume horaire :"
        items={[
          { label: "Total mensuel", value: `${Math.round(monthlyHours)}h` },
          {
            label: "Taux horaire visé (brut)",
            value: `${hourlyRate.toFixed(2)}€/h`,
          },
        ]}
      />

      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs flex gap-2">
        <Info className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Sécurité VTC :</strong> max 10h de
          conduite/jour, 11h de repos consécutif obligatoire.
        </p>
      </div>
    </div>
  );
}

function PlatformsStep({
  selected,
  onToggle,
  platformPct,
  onPctChange,
  currentRevenue,
  onCurrentRevenueChange,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  platformPct: number;
  onPctChange: (n: number) => void;
  currentRevenue: number;
  onCurrentRevenueChange: (n: number) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Car}
        title="Sur quelles plateformes travailles-tu ?"
        subtitle="On les ajoute à ton tableau de suivi quotidien (CA externe)."
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Tes plateformes actuelles</Label>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_PLATFORMS.filter((p) => p.name !== "Clients directs").map(
            (p) => {
              const active = selected.includes(p.name);
              return (
                <button
                  key={p.name}
                  onClick={() => onToggle(p.name)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2",
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border hover:bg-muted"
                  )}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {p.name}
                </button>
              );
            }
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Tu pourras en ajouter/supprimer dans Performance → Plateformes.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Ton CA mensuel actuel (€)</Label>
        <NumericInput
          value={currentRevenue}
          onChange={(v) => onCurrentRevenueChange(typeof v === "number" ? v : 0)}
          min={0}
          step={100}
          className="text-lg font-bold h-12 text-center"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">% de ton CA via plateformes</Label>
          <span className="text-lg font-bold text-primary">{platformPct}%</span>
        </div>
        <Slider
          value={[platformPct]}
          onValueChange={(v) => onPctChange(v[0])}
          min={0}
          max={100}
          step={5}
        />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/30 rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Plateformes</div>
            <div className="font-bold text-destructive">{platformPct}%</div>
          </div>
          <div className="bg-primary/5 rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Direct (libre)</div>
            <div className="font-bold text-primary">{100 - platformPct}%</div>
          </div>
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs flex gap-2">
        <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Pourquoi cette mesure ?</strong>{" "}
          Aujourd'hui tu paies 18 à 45% de commission sur les plateformes.
          L'objectif SoloCab est de basculer progressivement vers le direct (0,50 €
          fixe par course).
        </p>
      </div>
    </div>
  );
}

function ExpensesStep({
  expenses,
  onChange,
  total,
  solocabFees,
  targetRevenue,
  netRevenue,
  netMarginPct,
}: {
  expenses: Record<ExpenseKey, number>;
  onChange: (e: Record<ExpenseKey, number>) => void;
  total: number;
  solocabFees: number;
  targetRevenue: number;
  netRevenue: number;
  netMarginPct: number;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Wallet}
        title="Tes dépenses mensuelles"
        subtitle="Pour calculer ton revenu net réel et ton seuil de rentabilité."
      />

      <div className="space-y-3">
        {EXPENSE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const value = expenses[preset.key];
          return (
            <div key={preset.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-xs font-medium">{preset.label}</Label>
                </div>
                <span className="text-sm font-bold">
                  {value.toLocaleString("fr-FR")}€
                </span>
              </div>
              <Slider
                value={[value]}
                onValueChange={(v) =>
                  onChange({ ...expenses, [preset.key]: v[0] })
                }
                min={0}
                max={preset.max}
                step={10}
              />
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-destructive/5 to-warning/5 border border-destructive/20 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total dépenses</span>
          <span className="font-bold text-destructive">
            {total.toLocaleString("fr-FR")}€
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Frais SoloCab</span>
          <span className="font-bold text-foreground">
            {solocabFees.toFixed(2)}€
          </span>
        </div>
        <div className="border-t border-border/50 pt-2 flex items-center justify-between">
          <span className="text-sm font-medium">Revenu net visé</span>
          <div className="text-right">
            <div
              className={cn(
                "text-lg font-bold",
                netRevenue > 0 ? "text-primary" : "text-destructive"
              )}
            >
              {netRevenue.toFixed(0)}€
            </div>
            <div className="text-[10px] text-muted-foreground">
              {netMarginPct.toFixed(1)}% de marge
            </div>
          </div>
        </div>
      </div>

      {netRevenue < 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs flex gap-2">
          <Info className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-destructive">
            Tes dépenses dépassent ton revenu visé. Augmente le CA cible ou réduis
            les dépenses.
          </p>
        </div>
      )}
    </div>
  );
}

function LiberationStep({
  cards,
  onCardsChange,
  scans,
  onScansChange,
  directs,
  onDirectsChange,
  indepPct,
  onIndepPctChange,
}: {
  cards: number;
  onCardsChange: (n: number) => void;
  scans: number;
  onScansChange: (n: number) => void;
  directs: number;
  onDirectsChange: (n: number) => void;
  indepPct: number;
  onIndepPctChange: (n: number) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={QrCode}
        title="Plan de libération mensuel"
        subtitle="Les leviers concrets pour devenir indépendant des plateformes."
      />

      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 border border-primary/20 rounded-lg p-3">
        <p className="text-xs font-semibold mb-2">Le funnel d'indépendance :</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <FunnelStep icon={Hand} label="Cartes" />
          <span>→</span>
          <FunnelStep icon={QrCode} label="Scans" />
          <span>→</span>
          <FunnelStep icon={UserPlus} label="Inscrits" />
          <span>→</span>
          <FunnelStep icon={Heart} label="Fidèles" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SmallTarget
          icon={Hand}
          label="Cartes /mois"
          value={cards}
          onChange={onCardsChange}
        />
        <SmallTarget
          icon={QrCode}
          label="Scans QR /mois"
          value={scans}
          onChange={onScansChange}
        />
        <SmallTarget
          icon={UserPlus}
          label="Clients directs /mois"
          value={directs}
          onChange={onDirectsChange}
        />
        <div className="space-y-1.5 bg-muted/30 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">% indépendance</Label>
            <span className="text-sm font-bold text-primary">{indepPct}%</span>
          </div>
          <Slider
            value={[indepPct]}
            onValueChange={(v) => onIndepPctChange(v[0])}
            min={5}
            max={100}
            step={5}
          />
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Sur 12 mois si tu tiens le cap :
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-bold text-foreground">{cards * 12}</div>
            <div className="text-[10px] text-muted-foreground">cartes</div>
          </div>
          <div>
            <div className="font-bold text-foreground">{scans * 12}</div>
            <div className="text-[10px] text-muted-foreground">scans</div>
          </div>
          <div>
            <div className="font-bold text-primary">{directs * 12}</div>
            <div className="text-[10px] text-muted-foreground">clients fidèles</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStep({
  revenue,
  courses,
  km,
  days,
  hours,
  expenses,
  solocabFees,
  netRevenue,
  netMarginPct,
  platforms,
  cards,
  scans,
  directs,
  indepPct,
}: {
  revenue: number;
  courses: number;
  km: number;
  days: number;
  hours: number;
  expenses: number;
  solocabFees: number;
  netRevenue: number;
  netMarginPct: number;
  platforms: string[];
  cards: number;
  scans: number;
  directs: number;
  indepPct: number;
}) {
  return (
    <div className="space-y-4">
      <StepHeader
        icon={CheckCircle2}
        title="Récapitulatif"
        subtitle="Vérifie tes objectifs avant validation finale."
      />

      <div className="grid grid-cols-2 gap-2">
        <SummaryCard
          icon={TrendingUp}
          label="CA mensuel"
          value={`${revenue.toLocaleString("fr-FR")}€`}
        />
        <SummaryCard
          icon={Calendar}
          label="Courses /mois"
          value={`${courses}`}
          sub={`${km.toLocaleString("fr-FR")} km`}
        />
        <SummaryCard
          icon={Clock}
          label="Planning"
          value={`${days}j × ${hours}h`}
          sub={`${days * hours * 4}h /mois`}
        />
        <SummaryCard
          icon={Car}
          label="Plateformes"
          value={`${platforms.length}`}
          sub={platforms.slice(0, 2).join(", ") + (platforms.length > 2 ? "…" : "")}
        />
        <SummaryCard
          icon={Wallet}
          label="Dépenses"
          value={`${expenses.toLocaleString("fr-FR")}€`}
          sub={`+ ${solocabFees.toFixed(0)}€ frais SoloCab`}
        />
        <SummaryCard
          icon={QrCode}
          label="Acquisition"
          value={`${directs} /mois`}
          sub={`${cards} cartes • ${scans} scans`}
        />
      </div>

      <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-2 border-primary/30 rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          Ton revenu NET visé
        </p>
        <div className="flex items-baseline justify-between">
          <span
            className={cn(
              "text-3xl font-bold",
              netRevenue > 0 ? "text-primary" : "text-destructive"
            )}
          >
            {netRevenue.toFixed(0)}€
          </span>
          <span className="text-xs text-muted-foreground">/mois</span>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-muted-foreground">
            Marge nette : <strong className="text-foreground">{netMarginPct.toFixed(1)}%</strong>
          </span>
          <span className="text-muted-foreground">
            Indépendance visée : <strong className="text-primary">{indepPct}%</strong>
          </span>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Modifiable à tout moment dans <strong>Performance → Objectifs</strong>.
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
      <div className="min-w-0">
        <h3 className="text-base sm:text-lg font-bold leading-tight">{title}</h3>
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

function PresetChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/50 border-border hover:bg-muted"
      )}
    >
      {children}
    </button>
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
    <div className="bg-card border border-border rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-primary" />
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <div className="text-sm sm:text-base font-bold leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}

function FunnelStep({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="w-4 h-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}

function SmallTarget({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: any;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5 bg-muted/30 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs">{label}</Label>
      </div>
      <NumericInput
        value={value}
        onChange={(v) => onChange(typeof v === "number" ? v : 0)}
        min={0}
        step={1}
        className="text-base font-bold h-9 text-center"
      />
    </div>
  );
}
