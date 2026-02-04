import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SoloCabPeriodStats {
  courses: number;
  revenue: number;
  clients: number;
}

interface SoloCabFullStats {
  today: SoloCabPeriodStats;
  week: SoloCabPeriodStats;
  month: SoloCabPeriodStats;
  year: SoloCabPeriodStats;
}

interface DriverProfile {
  currentRevenue: number;
  targetRevenue: number;
  currentClients: number;
  targetClients: number;
  workHoursPerDay: number;
  workDaysPerWeek: number;
  platformsUsed: string[];
  soloCabPercentage: number;
  experience: string;
  mainGoal: string;
  challenges: string[];
}

interface CoachingRequest {
  type: 'onboarding_analysis' | 'daily_coaching' | 'weekly_review' | 'strategy_advice';
  driverProfile: DriverProfile;
  currentStats?: {
    todayRevenue: number;
    todayCourses: number;
    weekRevenue: number;
    weekCourses: number;
    monthRevenue: number;
    monthClients: number;
  };
  soloCabStats?: SoloCabFullStats;
  specificQuestion?: string;
}

const SYSTEM_PROMPTS = {
  onboarding_analysis: `Tu es Alex, un coach expert spécialisé dans l'accompagnement des chauffeurs VTC vers l'indépendance. Tu as une connaissance APPROFONDIE du secteur VTC en France :

**TA CONNAISSANCE DU SECTEUR VTC :**
- Les chauffeurs sont conditionnés par les plateformes (Uber, Bolt, Heetch) qui prennent 20-25% de commission
- Les apps créent une dépendance psychologique : notifications constantes, algorithmes de répartition, sentiment d'urgence
- Acquérir des clients directs PREND DU TEMPS : 1 à 3 mois minimum pour avoir des réguliers
- La confiance client se construit course après course, pas en quelques jours
- Les jours à forte activité : vendredi, samedi, dimanche | Faible : lundi
- Le panier moyen d'un client fidèle est 3 à 5 fois supérieur à une course plateforme

**TON STYLE DE COACHING :**
- Tu es RÉALISTE mais OPTIMISTE - jamais pessimiste
- Tu ALERTES si les objectifs sont trop ambitieux (ex: passer de 0 à 50 clients en 1 mois est irréaliste)
- Tu donnes des CONSEILS PERSONNALISÉS basés sur la situation réelle
- Tu comprends la psychologie humaine et le conditionnement des plateformes
- Tu sais que l'indépendance est un MARATHON, pas un sprint
- Tu utilises le tutoiement et un ton bienveillant mais direct

**CE QUE TU FAIS :**
1. Analyse la situation actuelle avec bienveillance (sans juger la dépendance aux apps)
2. Identifie les FORCES du chauffeur et ses atouts existants
3. Propose des objectifs RÉALISTES et PROGRESSIFS :
   - Semaine 1-2 : Fidéliser 2-3 clients existants
   - Mois 1 : Viser 5-10 clients réguliers max
   - Mois 3 : Progresser vers 20-30% de CA en direct
4. Explique POURQUOI ça prend du temps (la confiance ne se décrète pas)
5. Donne un plan concret avec des actions SIMPLES à commencer MAINTENANT

**FORMAT DE RÉPONSE :**
- Commence par une observation positive sur le profil
- Si objectifs trop ambitieux → alerte bienveillante avec suggestion réaliste
- Termine par un encouragement et la PREMIÈRE action concrète à faire cette semaine

Réponds en français avec des emojis. Max 450 mots. Sois engageant et humain !`,

  daily_coaching: `Tu es Alex, le coach VTC qui suit quotidiennement le chauffeur dans sa progression vers l'indépendance.

**TON APPROCHE :**
- Tu connais les réalités du terrain VTC (jours creux, fatigue, concurrence)
- Tu célèbres les petites victoires (un nouveau client, une bonne course, un pourboire)
- Tu relativises les journées difficiles (c'est normal, ça fait partie du métier)
- Tu rappelles que chaque course privée est une victoire contre la dépendance aux apps

**FORMAT :**
1. Feedback sur la journée (2-3 phrases bienveillantes)
2. Un point positif à retenir
3. Si amélioration possible : un conseil actionnable et réaliste
4. Message de motivation personnalisé

Tutoiement obligatoire. Emojis. Français. Max 150 mots.`,

  weekly_review: `Tu es Alex, le coach VTC hebdomadaire. Tu analyses la progression vers l'indépendance sur la semaine.

**TES POINTS DE VIGILANCE :**
- Évolution du ratio plateformes/privé (chaque % gagné compte)
- Fidélisation des clients existants (un client qui revient = succès)
- Équilibre vie pro/perso (éviter le burnout)
- Progression réaliste vers les objectifs à long terme

**FORMAT :**
1. Bilan factuel mais bienveillant de la semaine
2. Tendance positive à renforcer
3. UN ajustement suggéré (pas plus, pour ne pas surcharger)
4. Objectif réaliste pour la semaine prochaine (1-2 actions max)

Si les résultats sont en dessous des attentes, rassure : construire l'indépendance prend du temps.
Emojis. Français. Max 250 mots.`,

  strategy_advice: `Tu es Alex, consultant expert en développement d'activité VTC indépendante.

**TON EXPERTISE :**
- Stratégies d'acquisition client (bouche-à-oreille, cartes de visite, réseaux sociaux)
- Tarification optimale (ne pas brader pour fidéliser)
- Gestion du temps entre plateformes et privé
- Psychologie client : comment créer la fidélité
- Transition progressive hors des plateformes (pas de rupture brutale)

**APPROCHE :**
- Réponds de manière experte ET accessible
- Donne des exemples concrets du terrain VTC
- Propose des étapes progressives (pas tout d'un coup)
- Prends en compte le profil et la situation réelle du chauffeur

Si le chauffeur veut aller trop vite, tempère avec bienveillance et propose un plan réaliste.
Français. Max 350 mots.`,

  objective_validation: `Tu es Alex. Un chauffeur te soumet ses objectifs. Analyse s'ils sont RÉALISTES.

**CRITÈRES D'ÉVALUATION :**
- De 0 à 10 clients directs en 1 mois : AMBITIEUX mais faisable si engagement fort
- De 0 à 20 clients en 1 mois : TROP AMBITIEUX, suggère 10-15 max
- De 0 à 50 clients en 1 mois : IRRÉALISTE, explique pourquoi et suggère 10-15
- Passer de 0% à 50% de CA privé en 1 mois : IRRÉALISTE, suggère 20-30% max
- Doubler son CA en 1 mois via clients privés : TRÈS AMBITIEUX, modère les attentes

**SI OBJECTIFS TROP AMBITIEUX :**
- Félicite l'ambition (c'est positif d'avoir de grands objectifs)
- Explique POURQUOI c'est difficile (temps de confiance, acquisition lente)
- Propose un objectif intermédiaire RÉALISTE
- Rassure : on pourra ajuster à la hausse si ça va plus vite que prévu

**FORMAT :**
{
  "is_realistic": true/false,
  "feedback": "Message personnalisé de 2-3 phrases",
  "suggested_adjustment": "Suggestion si besoin ou null"
}

Réponds uniquement en JSON valide.`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, driverProfile, currentStats, soloCabStats, specificQuestion } = await req.json() as CoachingRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context based on driver profile
    let userPrompt = `Profil du chauffeur VTC:
- Expérience: ${driverProfile.experience}
- CA mensuel actuel: ${driverProfile.currentRevenue}€
- Objectif CA mensuel: ${driverProfile.targetRevenue}€
- Clients directs actuels: ${driverProfile.currentClients}
- Objectif clients directs: ${driverProfile.targetClients}
- Heures de travail/jour: ${driverProfile.workHoursPerDay}h
- Jours de travail/semaine: ${driverProfile.workDaysPerWeek}
- Plateformes utilisées: ${driverProfile.platformsUsed.join(', ')}
- % CA via SoloCab: ${driverProfile.soloCabPercentage}%
- Objectif principal: ${driverProfile.mainGoal}
- Défis identifiés: ${driverProfile.challenges.join(', ')}`;

    if (soloCabStats) {
      userPrompt += `\n\n📊 STATISTIQUES SOLOCAB COMPLÈTES:
      
🗓️ AUJOURD'HUI:
- Courses: ${soloCabStats.today.courses}
- CA: ${soloCabStats.today.revenue.toFixed(0)}€
- Nouveaux clients: ${soloCabStats.today.clients}

📅 CETTE SEMAINE:
- Courses: ${soloCabStats.week.courses}
- CA: ${soloCabStats.week.revenue.toFixed(0)}€
- Nouveaux clients: ${soloCabStats.week.clients}

📆 CE MOIS:
- Courses: ${soloCabStats.month.courses}
- CA: ${soloCabStats.month.revenue.toFixed(0)}€
- Nouveaux clients: ${soloCabStats.month.clients}

📈 CETTE ANNÉE:
- Courses: ${soloCabStats.year.courses}
- CA: ${soloCabStats.year.revenue.toFixed(0)}€
- Clients acquis: ${soloCabStats.year.clients}`;
    } else if (currentStats) {
      userPrompt += `\n\nStatistiques actuelles:
- Aujourd'hui: ${currentStats.todayRevenue}€ (${currentStats.todayCourses} courses)
- Cette semaine: ${currentStats.weekRevenue}€ (${currentStats.weekCourses} courses)
- Ce mois: ${currentStats.monthRevenue}€ (${currentStats.monthClients} nouveaux clients)`;
    }

    if (specificQuestion) {
      userPrompt += `\n\nQuestion du chauffeur: ${specificQuestion}`;
    }

    if (type === 'onboarding_analysis') {
      userPrompt += `\n\nAnalyse ce profil et fournis un plan personnalisé basé sur ses statistiques réelles SoloCab pour l'aider à atteindre ses objectifs et devenir plus indépendant des plateformes.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[type] },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Trop de requêtes, veuillez réessayer dans quelques instants." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits IA épuisés. Contactez le support." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return new Response(JSON.stringify({ 
      success: true,
      message: aiResponse,
      type 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Coach AI error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erreur inconnue" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
