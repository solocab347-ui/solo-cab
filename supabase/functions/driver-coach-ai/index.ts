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
  onboarding_analysis: `Tu es un coach expert pour chauffeurs VTC français. Tu analyses le profil d'un nouveau chauffeur et fournis:
1. Une analyse de sa situation actuelle (forces et points d'amélioration)
2. Des objectifs réalistes et progressifs
3. Un plan d'action concret pour les 30 premiers jours
4. Des conseils pour réduire la dépendance aux plateformes
5. Des stratégies d'acquisition de clients directs

Sois motivant, précis et pragmatique. Utilise des emojis pour rendre le message engageant.
Réponds en français. Limite ta réponse à 500 mots maximum.`,

  daily_coaching: `Tu es un coach VTC quotidien. Basé sur les performances du jour et les objectifs, fournis:
1. Un feedback sur la journée (2-3 phrases)
2. Ce qui va bien / ce qui peut s'améliorer
3. Un conseil actionnable pour demain
4. Un message de motivation personnalisé

Sois concis et encourageant. Utilise des emojis. Réponds en français. Max 200 mots.`,

  weekly_review: `Tu es un coach VTC hebdomadaire. Analyse la semaine et fournis:
1. Bilan de la semaine vs objectifs
2. Tendances positives/négatives identifiées
3. Ajustements recommandés pour la semaine suivante
4. Focus prioritaire de la semaine à venir

Réponds en français avec des emojis. Max 300 mots.`,

  strategy_advice: `Tu es un consultant expert en développement d'activité VTC. Le chauffeur te pose une question spécifique.
Réponds de manière experte, actionnable et personnalisée basée sur son profil.
Donne des exemples concrets et des étapes précises.
Réponds en français. Max 400 mots.`
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
