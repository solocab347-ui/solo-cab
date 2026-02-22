import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";
import {
  getPageDims,
  addFooter,
  addChapterPage,
  addSectionTitle,
  addParagraph,
  addBulletList,
  addInfoCard,
  addStatBoxes,
} from "./solocabEbookHelpers";

const c = ebookColors;

// ========== COVER ==========
export const addCover = (doc: jsPDF) => {
  const { w, h } = getPageDims(doc);

  doc.setFillColor(...c.primaryBlue);
  doc.rect(0, 0, w, h, "F");

  // Decorative circles
  doc.setFillColor(0, 65, 140);
  doc.circle(-40, 60, 100, "F");
  doc.circle(w + 40, h - 60, 120, "F");
  doc.circle(w / 2, -30, 50, "F");

  // Gold lines
  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(3);
  doc.line(30, 70, w - 30, 70);
  doc.line(30, h - 80, w - 30, h - 80);

  // Logo area
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...c.accentGold);
  doc.text("SOLOCAB", w / 2, 50, { align: "center" });

  // Main title
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("LE GUIDE", w / 2, 110, { align: "center" });
  doc.text("COMPLET", w / 2, 130, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(...c.accentGold);
  doc.text("de la Plateforme SoloCab", w / 2, 150, { align: "center" });

  // Subtitle box
  doc.setFillColor(0, 65, 140);
  doc.roundedRect(35, 170, w - 70, 40, 5, 5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const sub = "La solution tout-en-un pour les chauffeurs VTC indépendants, les gestionnaires de flotte et les entreprises.";
  const subLines = doc.splitTextToSize(sub, w - 90);
  doc.text(subLines, w / 2, 185, { align: "center" });

  // Highlights
  const highlights = [
    "🚗  Chauffeurs indépendants",
    "🏢  Entreprises & Collaborateurs",
    "📊  Gestion & Analytics",
    "💳  Paiements intégrés",
  ];
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  highlights.forEach((h, i) => {
    doc.text(h, w / 2, 230 + i * 10, { align: "center" });
  });

  // Bottom
  doc.setFontSize(9);
  doc.setTextColor(...c.accentGold);
  doc.text("www.solocab.fr | contact@solocab.fr", w / 2, h - 30, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 220);
  doc.text("Édition 2026", w / 2, h - 20, { align: "center" });
};

// ========== TABLE OF CONTENTS ==========
export const addTableOfContents = (doc: jsPDF) => {
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...c.primaryBlue);
  doc.text("SOMMAIRE", w / 2, 30, { align: "center" });

  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(2);
  doc.line(margin, 35, w - margin, 35);

  const chapters = [
    { num: 1, title: "Présentation de SoloCab", page: 4 },
    { num: 2, title: "L'Écosystème Complet", page: 7 },
    { num: 3, title: "Espace Chauffeur VTC", page: 11 },
    { num: 4, title: "Gestionnaire de Flotte", page: 16 },
    { num: 5, title: "Espace Entreprise", page: 20 },
    { num: 6, title: "Outils & Technologies", page: 24 },
    { num: 7, title: "Tarification & Offres", page: 28 },
    { num: 8, title: "Rejoindre SoloCab", page: 31 },
  ];

  let y = 50;
  chapters.forEach((ch) => {
    // Number circle
    doc.setFillColor(...c.primaryBlue);
    doc.circle(margin + 8, y - 1.5, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${ch.num}`, margin + 8, y, { align: "center" });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...c.darkText);
    doc.text(ch.title, margin + 20, y + 1);

    // Dots
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...c.lightGray);
    const titleEnd = margin + 20 + doc.getTextWidth(ch.title) + 3;
    const pageX = w - margin - 5;
    const dotLen = pageX - titleEnd;
    if (dotLen > 0) {
      const dots = ".".repeat(Math.floor(dotLen / 1.5));
      doc.text(dots, titleEnd, y + 1);
    }

    // Page number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...c.primaryBlue);
    doc.text(`${ch.page}`, w - margin, y + 1, { align: "right" });

    y += 18;
  });

  addFooter(doc, 2);
};

// ========== INTRO PAGE ==========
export const addIntroPage = (doc: jsPDF) => {
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...c.primaryBlue);
  doc.text("AVANT-PROPOS", w / 2, 25, { align: "center" });

  let y = 40;
  y = addParagraph(doc, y, "SoloCab est né d'un constat simple : les chauffeurs VTC méritent une plateforme qui travaille AVEC eux, pas CONTRE eux. Une plateforme qui respecte leur indépendance tout en leur offrant les outils pour la transformer en réussite durable.");

  y = addParagraph(doc, y, "Ce guide complet vous présente l'ensemble de l'écosystème SoloCab : de l'inscription à la gestion avancée, en passant par les fonctionnalités pour les entreprises et les gestionnaires de flotte.");

  y += 5;
  y = addInfoCard(doc, y, "💡 Notre philosophie",
    "SoloCab ne travaille pas à ta place. Il travaille avec toi. L'indépendance n'est pas un statut, c'est une discipline. Un chauffeur sans objectif subit. Un chauffeur avec des objectifs pilote.",
    c.lightGold, c.accentGold);

  y += 5;
  y = addSectionTitle(doc, y, "À qui s'adresse ce guide ?");

  y = addBulletList(doc, y, [
    "Chauffeurs VTC indépendants souhaitant développer leur activité",
    "Gestionnaires de flotte recherchant un outil de management complet",
    "Entreprises voulant optimiser la gestion de leurs déplacements",
    "Partenaires et investisseurs souhaitant comprendre notre vision",
  ]);

  y += 5;
  y = addStatBoxes(doc, y, [
    { value: "0%", label: "Commission" },
    { value: "100%", label: "Indépendance" },
    { value: "24/7", label: "Disponibilité" },
    { value: "∞", label: "Potentiel" },
  ]);

  addFooter(doc, 3);
};

// ========== CHAPTER 1: PRESENTATION (3 pages) ==========
export const addChapter1 = (doc: jsPDF) => {
  // Chapter cover
  addChapterPage(doc, 1, "Présentation de SoloCab", "Découvrez la plateforme qui réinvente le VTC en France", 4);

  // Page 5
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);

  let y = 20;
  y = addSectionTitle(doc, y, "Qu'est-ce que SoloCab ?");
  y = addParagraph(doc, y, "SoloCab est une plateforme française dédiée aux professionnels du transport VTC. Contrairement aux plateformes traditionnelles qui prélèvent des commissions allant de 20% à 30%, SoloCab propose un modèle basé sur l'abonnement, laissant 100% des revenus de course aux chauffeurs.");

  y = addParagraph(doc, y, "Fondée avec la conviction que les chauffeurs VTC sont des entrepreneurs à part entière, SoloCab offre un écosystème complet d'outils professionnels : gestion de clientèle, facturation, planification, analytique et bien plus.");

  y += 3;
  y = addSectionTitle(doc, y, "Notre Mission");
  y = addInfoCard(doc, y, "🎯 Vision",
    "Permettre à chaque chauffeur VTC de construire une activité rentable et pérenne, en toute indépendance. Nous croyons que la technologie doit servir le professionnel, jamais l'asservir.",
    c.lightBg, c.primaryBlue);

  y = addSectionTitle(doc, y, "Nos Valeurs Fondamentales");
  y = addBulletList(doc, y, [
    "Indépendance : Le chauffeur est son propre patron, SoloCab est son outil",
    "Transparence : Aucun frais caché, tarification claire et prévisible",
    "Innovation : Technologies de pointe au service du terrain",
    "Communauté : Un réseau de professionnels qui s'entraident",
    "Conformité : Respect total de la réglementation VTC et RGPD",
  ]);

  y += 3;
  y = addStatBoxes(doc, y, [
    { value: "2026", label: "Lancement" },
    { value: "France", label: "Couverture" },
    { value: "SaaS", label: "Modèle" },
    { value: "RGPD", label: "Conforme" },
  ]);

  addFooter(doc, 5);

  // Page 6
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Le Problème que Nous Résolvons");
  y = addParagraph(doc, y, "Le marché VTC souffre de nombreuses inefficacités qui pénalisent les chauffeurs :");

  const problems = [
    { title: "Commissions excessives", desc: "Les plateformes traditionnelles prélèvent 20-30% sur chaque course, réduisant drastiquement la rentabilité des chauffeurs." },
    { title: "Dépendance algorithmique", desc: "Les chauffeurs sont soumis aux algorithmes de répartition des courses, sans contrôle sur leur activité." },
    { title: "Absence d'outils pro", desc: "Pas de CRM, pas de facturation avancée, pas d'analytics pour piloter son activité." },
    { title: "Isolement professionnel", desc: "Aucun outil de mise en réseau ou de collaboration entre chauffeurs indépendants." },
  ];

  problems.forEach((p) => {
    y = addInfoCard(doc, y, `❌ ${p.title}`, p.desc, c.lightOrange, c.orange);
  });

  y += 3;
  y = addSectionTitle(doc, y, "La Solution SoloCab");
  y = addParagraph(doc, y, "SoloCab répond à chacun de ces problèmes avec une approche radicalement différente : un abonnement fixe qui laisse 100% des courses au chauffeur, des outils professionnels complets, et une communauté structurée.");

  addFooter(doc, 6);
};

// ========== CHAPTER 2: ECOSYSTEM (4 pages) ==========
export const addChapter2 = (doc: jsPDF) => {
  addChapterPage(doc, 2, "L'Écosystème Complet", "Tous les acteurs connectés dans une seule plateforme", 7);

  // Page 8
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);
  let y = 20;
  y = addSectionTitle(doc, y, "Les 5 Piliers de l'Écosystème");
  y = addParagraph(doc, y, "SoloCab connecte cinq types d'acteurs dans un écosystème cohérent et efficace. Chaque acteur dispose de son espace dédié avec des fonctionnalités adaptées à ses besoins spécifiques.");

  const pillars = [
    { title: "🚗 Chauffeur VTC Indépendant", desc: "Le cœur de la plateforme. Gère ses clients, ses courses, sa facturation et son développement commercial de manière autonome." },
    { title: "🏢 Gestionnaire de Flotte", desc: "Supervise plusieurs chauffeurs. Organise les plannings, répartit les courses, suit les performances et gère la conformité administrative." },
    { title: "🏭 Entreprise", desc: "Réserve des courses pour ses collaborateurs. Bénéficie d'une facturation centralisée et de rapports de dépenses détaillés." },
    { title: "👤 Collaborateur", desc: "L'employé d'une entreprise cliente. Réserve ses courses dans le cadre du budget alloué par son entreprise." },
    { title: "🛡️ Administrateur SoloCab", desc: "Supervise l'ensemble de la plateforme, vérifie les documents, gère les validations et assure le bon fonctionnement." },
  ];

  pillars.forEach((p) => {
    y = addInfoCard(doc, y, p.title, p.desc, c.lightBg, c.primaryBlue);
  });

  addFooter(doc, 8);

  // Page 9
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Les Interactions entre Acteurs");
  y = addParagraph(doc, y, "L'écosystème SoloCab fonctionne grâce à des interactions fluides et sécurisées entre les différents acteurs :");

  y = addBulletList(doc, y, [
    "Chauffeur ↔ Client : Réservation directe, sans intermédiaire ni commission",
    "Chauffeur ↔ Gestionnaire de Flotte : Attribution des courses, suivi des performances",
    "Entreprise ↔ Chauffeur/Flotte : Demandes de course, devis automatiques, facturation",
    "Collaborateur ↔ Entreprise : Budget alloué, validation des courses, reporting",
    "Admin ↔ Tous : Vérification des documents, validation des inscriptions, support",
  ]);

  y += 5;
  y = addSectionTitle(doc, y, "Architecture Technique");
  y = addParagraph(doc, y, "SoloCab repose sur une architecture cloud moderne, sécurisée et scalable :");

  y = addBulletList(doc, y, [
    "Application web responsive (desktop, tablette, mobile)",
    "Base de données sécurisée avec chiffrement des données sensibles",
    "API RESTful pour les intégrations tierces",
    "Notifications en temps réel (push, email, SMS)",
    "Conformité RGPD et hébergement en Europe",
  ]);

  y += 5;
  y = addInfoCard(doc, y, "🔒 Sécurité",
    "Toutes les communications sont chiffrées. Les données personnelles sont protégées par des politiques d'accès strictes (Row Level Security). Chaque utilisateur n'accède qu'à ses propres données.",
    c.lightGreen, c.green);

  addFooter(doc, 9);

  // Page 10
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Le Partage de Chauffeurs");
  y = addParagraph(doc, y, "Une fonctionnalité unique de SoloCab : les chauffeurs indépendants peuvent choisir de rendre leur profil visible aux gestionnaires de flotte et aux entreprises, créant ainsi un réseau de chauffeurs disponibles.");

  y = addInfoCard(doc, y, "🤝 Comment ça marche ?",
    "Le chauffeur active l'option 'Visible pour le partage' dans ses paramètres. Les gestionnaires de flotte peuvent alors le trouver et lui proposer des courses. Le chauffeur reste libre d'accepter ou refuser chaque proposition.",
    c.lightPurple, c.purple);

  y += 3;
  y = addSectionTitle(doc, y, "Avantages du Partage");

  const shareAdvantages = [
    { title: "Pour le Chauffeur", items: ["Plus de courses disponibles", "Diversification de la clientèle", "Maintien de l'indépendance totale"] },
    { title: "Pour la Flotte", items: ["Accès à des chauffeurs qualifiés", "Flexibilité en période de forte demande", "Pas d'engagement long terme"] },
    { title: "Pour l'Entreprise", items: ["Plus de chauffeurs disponibles", "Meilleure couverture géographique", "Tarifs compétitifs"] },
  ];

  shareAdvantages.forEach((sa) => {
    y = addInfoCard(doc, y, sa.title, sa.items.join(" • "), c.lightBg, c.primaryBlue);
  });

  y += 3;
  y = addSectionTitle(doc, y, "Statistiques de l'Écosystème");
  y = addStatBoxes(doc, y, [
    { value: "5", label: "Types d'acteurs" },
    { value: "360°", label: "Vue complète" },
    { value: "Temps réel", label: "Synchronisation" },
  ]);

  addFooter(doc, 10);
};

// ========== CHAPTER 3: DRIVER SPACE (5 pages) ==========
export const addChapter3 = (doc: jsPDF) => {
  addChapterPage(doc, 3, "Espace Chauffeur VTC", "Tous les outils pour développer votre activité", 11);

  // Page 12
  doc.addPage();
  let y = 20;
  y = addSectionTitle(doc, y, "Tableau de Bord Chauffeur");
  y = addParagraph(doc, y, "Dès la connexion, le chauffeur accède à un tableau de bord complet qui synthétise toute son activité. Un véritable cockpit pour piloter son entreprise.");

  y = addBulletList(doc, y, [
    "Chiffre d'affaires du jour, de la semaine, du mois",
    "Nombre de courses en attente, confirmées, terminées",
    "Prochaines courses programmées avec détails client",
    "Notifications et alertes importantes",
    "Indicateurs de performance personnalisables",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Gestion des Clients (CRM)");
  y = addParagraph(doc, y, "SoloCab intègre un véritable CRM professionnel pour chauffeur VTC. Gérez votre portefeuille clients comme un entrepreneur :");

  y = addBulletList(doc, y, [
    "Fiche client détaillée (coordonnées, préférences, historique)",
    "Clients exclusifs ou partagés selon vos préférences",
    "Classement des clients par fréquence et valeur",
    "Notes et commentaires sur chaque client",
    "Export de la base de données clients",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "💡 Astuce Pro",
    "Utilisez le système de clients favoris pour identifier vos meilleurs clients et leur offrir un service privilégié. Un client fidèle vaut 10 nouveaux clients !",
    c.lightGold, c.accentGold);

  addFooter(doc, 12);

  // Page 13
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Gestion des Courses");
  y = addParagraph(doc, y, "Le module de gestion des courses est le cœur opérationnel de SoloCab. Créez, planifiez et suivez toutes vos courses en quelques clics :");

  y = addBulletList(doc, y, [
    "Création rapide avec auto-complétion des adresses",
    "Calcul automatique de la distance et de l'estimation tarifaire",
    "Programmation à l'avance ou course immédiate",
    "Suivi du statut en temps réel (en attente, en cours, terminée)",
    "Attribution multi-chauffeurs pour les courses partagées",
    "Historique complet avec filtres avancés",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Tarification Intelligente");
  y = addParagraph(doc, y, "Définissez votre grille tarifaire avec une précision inégalée :");

  y = addBulletList(doc, y, [
    "Tarif au kilomètre personnalisable par ville/secteur",
    "Prise en charge et tarif minimum configurables",
    "Majoration heures de pointe (3 créneaux paramétrables)",
    "Supplément soirée, week-end et jours fériés",
    "Supplément aéroport/gare automatique",
    "Remise heures creuses pour encourager l'activité",
    "TVA paramétrable (incluse ou exclue)",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "📊 Tarification par Secteur",
    "Créez des grilles tarifaires différentes par secteur géographique. Par exemple, des tarifs spécifiques pour les zones aéroport, centre-ville ou banlieue.",
    c.lightTeal, c.teal);

  addFooter(doc, 13);

  // Page 14
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Facturation & Devis");
  y = addParagraph(doc, y, "Gérez toute votre comptabilité directement dans SoloCab :");

  y = addBulletList(doc, y, [
    "Génération automatique de factures conformes",
    "Création de devis personnalisés",
    "Numérotation séquentielle automatique",
    "Export PDF professionnel avec votre branding",
    "Suivi des paiements (payé, en attente, en retard)",
    "Intégration avec les terminaux de paiement SumUp",
    "Historique comptable exportable",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "QR Code & Carte NFC");
  y = addParagraph(doc, y, "Chaque chauffeur dispose d'un QR code et d'une carte NFC personnalisés :");

  y = addBulletList(doc, y, [
    "QR code unique lié à votre profil professionnel",
    "Page de réservation personnalisée accessible via le QR code",
    "Carte NFC programmable (offerte lors de nos événements)",
    "Partage facilité avec les clients potentiels",
    "Statistiques de scan et de conversion",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "🎯 Votre Vitrine Professionnelle",
    "Votre page de réservation personnalisée est accessible 24h/24. Les clients y trouvent vos services, vos tarifs, vos avis et peuvent réserver directement. C'est votre site web professionnel intégré à SoloCab.",
    c.lightOrange, c.orange);

  y += 3;
  y = addStatBoxes(doc, y, [
    { value: "PDF", label: "Factures pro" },
    { value: "QR", label: "Code unique" },
    { value: "NFC", label: "Carte pro" },
    { value: "TPE", label: "Paiement CB" },
  ]);

  addFooter(doc, 14);

  // Page 15
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Outils Marketing");
  y = addParagraph(doc, y, "SoloCab fournit des outils marketing intégrés pour développer votre base clients :");

  y = addBulletList(doc, y, [
    "Campagnes promotionnelles personnalisées",
    "Codes promo pour fidéliser ou acquérir des clients",
    "Programme de parrainage intégré",
    "Partage automatique sur les réseaux sociaux",
    "Flyers PDF professionnels générés automatiquement",
    "Notifications push aux clients pour les promotions",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Analytics & Reporting");
  y = addParagraph(doc, y, "Pilotez votre activité avec des données précises :");

  y = addBulletList(doc, y, [
    "Chiffre d'affaires par période (jour, semaine, mois, année)",
    "Répartition des courses par type et par zone",
    "Taux d'occupation et temps d'attente moyen",
    "Analyse de la rentabilité par client",
    "Comparaison mensuelle des performances",
    "Export des données pour votre comptable",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Conformité Administrative");
  y = addParagraph(doc, y, "SoloCab vous aide à rester en règle :");

  y = addBulletList(doc, y, [
    "Stockage sécurisé de tous vos documents professionnels",
    "Alertes d'expiration automatiques (carte VTC, assurance, contrôle technique)",
    "Vérification des documents par l'équipe SoloCab",
    "Registre des courses conforme à la réglementation",
  ]);

  addFooter(doc, 15);
};

// ========== CHAPTER 4: FLEET MANAGER (4 pages) ==========
export const addChapter4 = (doc: jsPDF) => {
  addChapterPage(doc, 4, "Gestionnaire de Flotte", "Gérez vos chauffeurs avec efficacité", 16);

  // Page 17
  doc.addPage();
  let y = 20;
  y = addSectionTitle(doc, y, "Vue d'Ensemble Flotte");
  y = addParagraph(doc, y, "Le gestionnaire de flotte dispose d'un tableau de bord complet pour superviser l'ensemble de ses chauffeurs et de leurs activités.");

  y = addBulletList(doc, y, [
    "Vue synthétique de tous les chauffeurs de la flotte",
    "Statut en temps réel (disponible, en course, hors ligne)",
    "Performances individuelles et collectives",
    "Chiffre d'affaires global et par chauffeur",
    "Alertes documents et conformité",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Gestion des Chauffeurs");
  y = addParagraph(doc, y, "Invitez, gérez et suivez vos chauffeurs :");

  y = addBulletList(doc, y, [
    "Invitation des chauffeurs par email ou lien",
    "Validation des documents administratifs",
    "Suivi des performances individuelles",
    "Attribution des courses manuelle ou automatique",
    "Gestion des plannings et disponibilités",
    "Communication directe avec chaque chauffeur",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "🔄 Partage de Chauffeurs Externe",
    "Accédez à des chauffeurs indépendants qui ont activé le partage. Proposez-leur des courses ponctuelles sans engagement, idéal pour les pics d'activité.",
    c.lightPurple, c.purple);

  addFooter(doc, 17);

  // Page 18
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Répartition des Courses");
  y = addParagraph(doc, y, "Un système intelligent de répartition des courses permet au gestionnaire d'optimiser l'utilisation de sa flotte :");

  y = addBulletList(doc, y, [
    "Vue calendrier avec toutes les courses planifiées",
    "Attribution par proximité géographique",
    "Gestion des priorités et des urgences",
    "Réaffectation en cas d'indisponibilité",
    "Notifications automatiques aux chauffeurs",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Contrats avec les Entreprises");
  y = addParagraph(doc, y, "Les gestionnaires de flotte peuvent contractualiser avec des entreprises :");

  y = addBulletList(doc, y, [
    "Accords de partenariat formalisés",
    "Tarifs préférentiels négociés",
    "Facturation centralisée vers l'entreprise",
    "Réception des demandes de course des entreprises",
    "Dispatching vers les chauffeurs de la flotte",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Tarification Flotte");
  y = addParagraph(doc, y, "Définissez une grille tarifaire uniforme pour toute votre flotte, ou laissez chaque chauffeur avec sa propre tarification. Les tarifs flotte s'appliquent prioritairement sur les courses attribuées par le gestionnaire.");

  y += 3;
  y = addStatBoxes(doc, y, [
    { value: "Multi", label: "Chauffeurs" },
    { value: "Auto", label: "Attribution" },
    { value: "B2B", label: "Contrats" },
  ]);

  addFooter(doc, 18);

  // Page 19
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Reporting Flotte");
  y = addParagraph(doc, y, "Des rapports détaillés pour piloter votre activité de gestionnaire :");

  y = addBulletList(doc, y, [
    "CA global de la flotte et ventilation par chauffeur",
    "Nombre de courses par période et par chauffeur",
    "Taux de satisfaction client par chauffeur",
    "Temps de réponse moyen aux demandes de course",
    "Analyse de la rentabilité par secteur géographique",
    "Export comptable mensuel",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Administration de la Flotte");
  y = addBulletList(doc, y, [
    "Gestion des documents de chaque chauffeur",
    "Suivi des véhicules et leurs documents (assurance, CT...)",
    "Gestion des frais d'annulation",
    "Configuration des méthodes de paiement acceptées",
    "Paramétrage des notifications et alertes",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "📱 Application Mobile",
    "Les chauffeurs de votre flotte reçoivent des notifications en temps réel pour les nouvelles courses attribuées. Ils peuvent accepter, décliner ou demander une réaffectation directement depuis leur mobile.",
    c.lightBg, c.primaryBlue);

  addFooter(doc, 19);
};

// ========== CHAPTER 5: ENTERPRISE (4 pages) ==========
export const addChapter5 = (doc: jsPDF) => {
  addChapterPage(doc, 5, "Espace Entreprise", "Optimisez les déplacements de vos collaborateurs", 20);

  // Page 21
  doc.addPage();
  let y = 20;
  y = addSectionTitle(doc, y, "Création du Compte Entreprise");
  y = addParagraph(doc, y, "Toute entreprise peut créer un compte sur SoloCab en fournissant ses informations légales (SIRET, adresse, contact). Le compte est vérifié par l'équipe SoloCab avant activation.");

  y += 3;
  y = addSectionTitle(doc, y, "Gestion des Collaborateurs");
  y = addParagraph(doc, y, "L'entreprise peut inviter ses collaborateurs à utiliser SoloCab pour leurs déplacements professionnels :");

  y = addBulletList(doc, y, [
    "Invitation par email avec création de compte simplifiée",
    "Attribution d'un budget mensuel par collaborateur",
    "Définition de rôles (admin entreprise, collaborateur simple)",
    "Suivi des dépenses en temps réel par collaborateur",
    "Blocage automatique en cas de dépassement de budget",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Demande de Course Entreprise");
  y = addParagraph(doc, y, "Les entreprises et leurs collaborateurs peuvent demander des courses de deux manières :");

  y = addInfoCard(doc, y, "📋 Mode Direct",
    "L'entreprise publie sa demande de course. Les chauffeurs/flottes partenaires reçoivent la demande et soumettent un devis. L'entreprise choisit le meilleur devis.",
    c.lightBg, c.primaryBlue);

  y = addInfoCard(doc, y, "🏢 Mode Flotte Dédiée",
    "L'entreprise a un accord avec un gestionnaire de flotte. Les demandes sont envoyées directement à cette flotte qui dispatche un chauffeur. Facturation selon les termes du contrat.",
    c.lightTeal, c.teal);

  addFooter(doc, 21);

  // Page 22
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Accords Entreprise-Chauffeur");
  y = addParagraph(doc, y, "SoloCab facilite la contractualisation entre entreprises et prestataires VTC :");

  y = addBulletList(doc, y, [
    "Proposition d'accord avec conditions de paiement",
    "Fréquence de facturation paramétrable (hebdo, mensuelle...)",
    "Méthodes de paiement acceptées définies dans l'accord",
    "Suivi de l'encours et des paiements",
    "Possibilité de remise négociée",
    "Modification ou résiliation avec validation mutuelle",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Facturation Centralisée");
  y = addParagraph(doc, y, "L'un des avantages majeurs pour les entreprises : une facturation centralisée qui simplifie la comptabilité :");

  y = addBulletList(doc, y, [
    "Une seule facture mensuelle regroupant toutes les courses",
    "Détail par collaborateur, par date, par trajet",
    "Export compatible avec les logiciels de comptabilité",
    "Rappels automatiques pour les factures impayées",
    "TVA et mentions légales conformes",
  ]);

  y += 3;
  y = addStatBoxes(doc, y, [
    { value: "1", label: "Facture unique" },
    { value: "N", label: "Collaborateurs" },
    { value: "Export", label: "Comptable" },
    { value: "RGPD", label: "Conforme" },
  ]);

  addFooter(doc, 22);

  // Page 23
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Reporting Entreprise");
  y = addParagraph(doc, y, "Des outils analytiques puissants pour les responsables transport :");

  y = addBulletList(doc, y, [
    "Dépenses par collaborateur et par département",
    "Analyse des trajets récurrents et optimisation",
    "Budget consommé vs. budget alloué",
    "Comparaison mensuelle des dépenses transport",
    "Rapports téléchargeables en PDF ou CSV",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Sécurité & Conformité");
  y = addParagraph(doc, y, "SoloCab garantit un niveau de sécurité maximal pour les entreprises :");

  y = addBulletList(doc, y, [
    "Tous les chauffeurs sont vérifiés (carte VTC, assurance, documents)",
    "Suivi GPS en temps réel des courses",
    "Conformité RGPD totale",
    "Données hébergées en Europe",
    "Politique de confidentialité stricte",
    "Audit trail complet de toutes les opérations",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "🛡️ Engagement Qualité",
    "SoloCab vérifie chaque chauffeur inscrit sur la plateforme. Documents à jour, véhicule conforme, assurance valide. Votre entreprise travaille uniquement avec des professionnels certifiés.",
    c.lightGreen, c.green);

  addFooter(doc, 23);
};

// ========== CHAPTER 6: TOOLS & TECH (4 pages) ==========
export const addChapter6 = (doc: jsPDF) => {
  addChapterPage(doc, 6, "Outils & Technologies", "Des innovations au service du quotidien", 24);

  // Page 25
  doc.addPage();
  let y = 20;
  y = addSectionTitle(doc, y, "Paiement Intégré");
  y = addParagraph(doc, y, "SoloCab intègre les solutions de paiement les plus modernes pour faciliter les encaissements :");

  y = addInfoCard(doc, y, "💳 Stripe Connect",
    "Paiement en ligne sécurisé intégré à la plateforme. Les clients peuvent payer par carte directement lors de la réservation ou après la course.",
    c.lightBg, c.primaryBlue);

  y = addInfoCard(doc, y, "📱 SumUp",
    "Terminal de paiement physique pour encaisser sur place. SoloCab est partenaire SumUp : obtenez votre terminal Solo Lite à prix préférentiel.",
    c.lightTeal, c.teal);

  y = addInfoCard(doc, y, "🏦 Revolut Business",
    "Compte professionnel avec IBAN, cartes de paiement, liens de paiement instantanés et outils de comptabilité. Ouverture gratuite via notre lien partenaire.",
    c.lightPurple, c.purple);

  y += 3;
  y = addSectionTitle(doc, y, "Technologie NFC");
  y = addParagraph(doc, y, "SoloCab est à la pointe de la technologie NFC (Near Field Communication) :");

  y = addBulletList(doc, y, [
    "Plaques NFC personnalisées pour votre véhicule",
    "Cartes de visite NFC programmables",
    "Le client scanne → accède à votre page de réservation",
    "Aucune application nécessaire côté client",
    "Compatible tous smartphones récents (iOS et Android)",
  ]);

  addFooter(doc, 25);

  // Page 26
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Géolocalisation & Cartographie");
  y = addParagraph(doc, y, "Un système de cartographie avancé propulsé par Mapbox :");

  y = addBulletList(doc, y, [
    "Auto-complétion des adresses en temps réel",
    "Calcul d'itinéraire optimisé",
    "Estimation de distance et de durée précise",
    "Visualisation des zones de couverture",
    "Géolocalisation du véhicule en temps réel",
    "Historique des trajets avec carte interactive",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Notifications Intelligentes");
  y = addParagraph(doc, y, "Un système de notifications multi-canal pour ne rien rater :");

  y = addBulletList(doc, y, [
    "Notifications push en temps réel dans l'application",
    "Emails automatiques (confirmation, rappel, facture)",
    "Alertes d'expiration de documents",
    "Notifications de nouvelle course disponible",
    "Rappels de courses programmées",
    "Résumé d'activité hebdomadaire",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "PWA (Progressive Web App)");
  y = addParagraph(doc, y, "SoloCab est une Progressive Web App : installez-la sur votre smartphone comme une application native, sans passer par les stores. Accès hors-ligne, notifications push, et une expérience fluide sur tous les appareils.");

  y += 3;
  y = addStatBoxes(doc, y, [
    { value: "PWA", label: "Multi-plateforme" },
    { value: "NFC", label: "Sans contact" },
    { value: "GPS", label: "Temps réel" },
    { value: "Push", label: "Notifications" },
  ]);

  addFooter(doc, 26);

  // Page 27
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Intelligence Artificielle");
  y = addParagraph(doc, y, "SoloCab intègre des fonctionnalités d'IA pour assister les chauffeurs et optimiser l'activité :");

  y = addBulletList(doc, y, [
    "Suggestions de tarification basées sur le marché",
    "Prédiction de la demande par zone et horaire",
    "Assistant virtuel pour les questions administratives",
    "Analyse automatique des tendances de votre activité",
    "Optimisation des itinéraires en temps réel",
  ]);

  y += 3;
  y = addSectionTitle(doc, y, "Intégrations & API");
  y = addParagraph(doc, y, "SoloCab s'intègre avec les outils professionnels les plus utilisés :");

  y = addBulletList(doc, y, [
    "API RESTful complète pour les développeurs",
    "Webhooks pour les événements en temps réel",
    "Export comptable compatible avec les logiciels de gestion",
    "Intégration calendrier (Google Calendar, Outlook)",
    "Partage automatique sur les réseaux sociaux",
  ]);

  y += 3;
  y = addInfoCard(doc, y, "🔧 API Entreprise",
    "Les entreprises et gestionnaires de flotte peuvent accéder à l'API SoloCab pour intégrer les fonctionnalités de réservation et de suivi directement dans leurs propres systèmes.",
    c.lightBg, c.primaryBlue);

  y += 3;
  y = addSectionTitle(doc, y, "Sécurité des Données");
  y = addBulletList(doc, y, [
    "Chiffrement des données au repos et en transit (TLS 1.3)",
    "Authentification multi-facteurs disponible",
    "Politiques d'accès strictes (Row Level Security)",
    "Sauvegardes automatiques quotidiennes",
    "Hébergement en Europe (conformité RGPD)",
    "Audit de sécurité régulier",
  ]);

  addFooter(doc, 27);
};

// ========== CHAPTER 7: PRICING (3 pages) ==========
export const addChapter7 = (doc: jsPDF) => {
  addChapterPage(doc, 7, "Tarification & Offres", "Un modèle transparent et accessible", 28);

  // Page 29
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);
  let y = 20;
  y = addSectionTitle(doc, y, "Notre Philosophie Tarifaire");
  y = addParagraph(doc, y, "Chez SoloCab, nous croyons que les chauffeurs doivent garder 100% de leurs revenus de course. C'est pourquoi nous avons choisi un modèle par abonnement, simple et prévisible.");

  y += 3;
  y = addInfoCard(doc, y, "💰 0% de Commission",
    "Contrairement aux plateformes traditionnelles qui prélèvent 20 à 30% sur chaque course, SoloCab ne prend AUCUNE commission. Vous gardez l'intégralité de vos revenus.",
    c.lightGreen, c.green);

  y += 3;
  y = addSectionTitle(doc, y, "Offre Chauffeur Indépendant");

  // Free tier
  y = addInfoCard(doc, y, "🆓 Accès Découverte — GRATUIT",
    "Essai gratuit de 2 mois avec accès complet à toutes les fonctionnalités. Aucune carte bancaire requise. À l'issue de la période, passage à l'abonnement mensuel.",
    c.lightGold, c.accentGold);

  // Paid tier
  y = addInfoCard(doc, y, "⭐ Abonnement Pro",
    "Accès illimité à toutes les fonctionnalités : CRM, facturation, analytics, NFC, QR code, promotions, support prioritaire. Tarif mensuel fixe et transparent.",
    c.lightBg, c.primaryBlue);

  y += 3;
  y = addSectionTitle(doc, y, "Offre Gestionnaire de Flotte");
  y = addParagraph(doc, y, "Le tarif gestionnaire de flotte est adapté au nombre de chauffeurs gérés. Contactez-nous pour un devis personnalisé incluant :");

  y = addBulletList(doc, y, [
    "Accès au tableau de bord multi-chauffeurs",
    "Dispatch automatique des courses",
    "Reporting consolidé",
    "Support dédié",
    "Formation de l'équipe",
  ]);

  addFooter(doc, 29);

  // Page 30
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, y, "Offre Entreprise");

  y = addInfoCard(doc, y, "🏢 PME — Gratuit",
    "Jusqu'à 10 collaborateurs • Facturation mensuelle • Support email • Accès au réseau de chauffeurs et flottes SoloCab",
    c.lightBg, c.primaryBlue);

  y = addInfoCard(doc, y, "🏭 ETI / Grande Entreprise — Sur mesure",
    "Collaborateurs illimités • API disponible • Account manager dédié • Tarifs négociés • Intégration sur mesure • SLA garanti",
    c.lightGold, c.accentGold);

  y += 5;
  y = addSectionTitle(doc, y, "Comparaison avec les Plateformes Traditionnelles");

  // Comparison table
  const tableData = [
    ["", "SoloCab", "Plateforme X", "Plateforme Y"],
    ["Commission", "0%", "20-25%", "25-30%"],
    ["Liberté tarifaire", "✅ Totale", "❌ Imposée", "❌ Imposée"],
    ["CRM intégré", "✅ Complet", "❌ Non", "❌ Non"],
    ["Facturation", "✅ Incluse", "⚠️ Basique", "❌ Non"],
    ["NFC / QR Code", "✅ Inclus", "❌ Non", "❌ Non"],
    ["Données client", "✅ Vos données", "❌ Plateforme", "❌ Plateforme"],
  ];

  doc.setFontSize(8);
  const colW = contentW / 4;
  tableData.forEach((row, rowIdx) => {
    const rowY = y + rowIdx * 9;
    if (rowIdx === 0) {
      doc.setFillColor(...c.primaryBlue);
      doc.rect(margin, rowY - 4, contentW, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
    } else if (rowIdx % 2 === 0) {
      doc.setFillColor(...c.lightBg);
      doc.rect(margin, rowY - 4, contentW, 9, "F");
    }

    row.forEach((cell, colIdx) => {
      if (rowIdx > 0) {
        doc.setFont("helvetica", colIdx === 0 ? "bold" : "normal");
        doc.setTextColor(...(colIdx === 1 ? c.green : c.darkText));
      }
      doc.text(cell, margin + colIdx * colW + 3, rowY + 1);
    });
  });

  y += tableData.length * 9 + 8;

  y = addInfoCard(doc, y, "💡 Le Calcul est Simple",
    "Un chauffeur qui réalise 4 000€ de CA mensuel paye 800-1200€ de commission aux plateformes traditionnelles. Avec SoloCab, il garde tout et ne paye qu'un abonnement fixe de quelques dizaines d'euros.",
    c.lightGreen, c.green);

  addFooter(doc, 30);
};

// ========== CHAPTER 8: JOIN US (2 pages) ==========
export const addChapter8 = (doc: jsPDF) => {
  addChapterPage(doc, 8, "Rejoindre SoloCab", "Commencez votre aventure dès maintenant", 31);

  // Page 32
  doc.addPage();
  const { w, margin, contentW } = getPageDims(doc);
  let y = 20;
  y = addSectionTitle(doc, y, "Comment Rejoindre SoloCab ?");

  const steps = [
    { num: "1", title: "Inscrivez-vous", desc: "Créez votre compte en quelques minutes sur www.solocab.fr. Renseignez vos informations et téléchargez vos documents professionnels." },
    { num: "2", title: "Vérification", desc: "Notre équipe vérifie vos documents (carte VTC, assurance, Kbis). Validation sous 24-48h." },
    { num: "3", title: "Configurez", desc: "Paramétrez votre profil, vos tarifs, votre page de réservation. Personnalisez SoloCab selon vos besoins." },
    { num: "4", title: "Lancez-vous !", desc: "Commencez à accepter des courses, développez votre clientèle et prenez le contrôle de votre activité." },
  ];

  steps.forEach((step) => {
    doc.setFillColor(...c.lightBg);
    doc.roundedRect(margin, y, contentW, 22, 3, 3, "F");

    // Step number
    doc.setFillColor(...c.orange);
    doc.circle(margin + 12, y + 11, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(step.num, margin + 12, y + 13, { align: "center" });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...c.darkText);
    doc.text(step.title, margin + 25, y + 8);

    // Desc
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...c.grayText);
    const lines = doc.splitTextToSize(step.desc, contentW - 30);
    doc.text(lines, margin + 25, y + 14);

    y += 26;
  });

  y += 5;
  y = addSectionTitle(doc, y, "Documents Requis");
  y = addBulletList(doc, y, [
    "Carte VTC en cours de validité",
    "Attestation d'assurance RC professionnelle",
    "Extrait Kbis ou inscription au registre",
    "Pièce d'identité",
    "Carte grise du véhicule",
    "Contrôle technique à jour",
  ]);

  addFooter(doc, 32);

  // BACK COVER (page 33)
  doc.addPage();
  doc.setFillColor(...c.primaryBlue);
  doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), "F");

  const h = doc.internal.pageSize.getHeight();

  // Decorative
  doc.setFillColor(0, 65, 140);
  doc.circle(w + 20, h / 4, 60, "F");
  doc.circle(-20, h * 0.75, 80, "F");

  doc.setDrawColor(...c.accentGold);
  doc.setLineWidth(2);
  doc.line(40, h / 2 - 60, w - 40, h / 2 - 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("SOLOCAB", w / 2, h / 2 - 35, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(...c.accentGold);
  doc.text("L'indépendance n'est pas un statut,", w / 2, h / 2 - 10, { align: "center" });
  doc.text("c'est une discipline.", w / 2, h / 2 + 2, { align: "center" });

  doc.setDrawColor(...c.accentGold);
  doc.line(60, h / 2 + 15, w - 60, h / 2 + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("www.solocab.fr", w / 2, h / 2 + 35, { align: "center" });
  doc.text("contact@solocab.fr", w / 2, h / 2 + 47, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 220);
  doc.text("SASU SoloCab | RCS Paris 994 176 576", w / 2, h - 30, { align: "center" });
  doc.text("10 rue de Penthièvre, 75008 Paris", w / 2, h - 22, { align: "center" });
};
