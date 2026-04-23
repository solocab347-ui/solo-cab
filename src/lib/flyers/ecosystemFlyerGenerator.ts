import jsPDF from "jspdf";

export const generateEcosystemFlyer = async () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryBlue: [number, number, number] = [0, 82, 165];
  const accentGold: [number, number, number] = [218, 165, 32];
  const lightBlue: [number, number, number] = [230, 240, 255];
  const darkText: [number, number, number] = [30, 30, 40];
  const grayText: [number, number, number] = [100, 100, 110];
  const emerald: [number, number, number] = [16, 185, 129];
  const purple: [number, number, number] = [139, 92, 246];
  const orange: [number, number, number] = [249, 115, 22];
  const rose: [number, number, number] = [244, 63, 94];

  // ========== PAGE 1 - COVER ==========
  
  // Background
  doc.setFillColor(...lightBlue);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top decorative wave
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 60, "F");
  
  // Wave effect
  doc.setFillColor(...lightBlue);
  for (let i = 0; i < pageWidth; i += 10) {
    const y = 55 + Math.sin(i * 0.1) * 5;
    doc.circle(i, y, 8, "F");
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("L'ÉCOSYSTÈME", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(36);
  doc.setTextColor(...accentGold);
  doc.text("SOLOCAB", pageWidth / 2, 42, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(...darkText);
  doc.text("La plateforme qui réunit tous les acteurs du VTC", pageWidth / 2, 75, { align: "center" });

  // Central hub illustration
  const centerX = pageWidth / 2;
  const centerY = 130;
  const hubRadius = 25;
  
  // Central circle - SoloCab
  doc.setFillColor(...primaryBlue);
  doc.circle(centerX, centerY, hubRadius, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("SOLOCAB", centerX, centerY - 3, { align: "center" });
  doc.setFontSize(7);
  doc.text("PLATEFORME", centerX, centerY + 4, { align: "center" });

  // Orbiting elements
  const actors = [
    { label: "Chauffeurs", angle: -90, color: emerald, icon: "🚗" },
    { label: "Gestionnaires", angle: -30, color: purple, icon: "📊" },
    { label: "Entreprises", angle: 30, color: orange, icon: "🏢" },
    { label: "Collaborateurs", angle: 90, color: rose, icon: "👥" },
    { label: "Clients", angle: 150, color: accentGold, icon: "⭐" },
    { label: "Partenaires", angle: 210, color: primaryBlue, icon: "🤝" },
  ];

  const orbitRadius = 55;
  
  actors.forEach((actor) => {
    const rad = (actor.angle * Math.PI) / 180;
    const x = centerX + Math.cos(rad) * orbitRadius;
    const y = centerY + Math.sin(rad) * orbitRadius;
    
    // Connection line
    doc.setDrawColor(...grayText);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(centerX, centerY, x, y);
    doc.setLineDashPattern([], 0);
    
    // Actor circle
    doc.setFillColor(...actor.color);
    doc.circle(x, y, 15, "F");
    
    // Actor label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(actor.label.toUpperCase(), x, y + 2, { align: "center" });
  });

  // Features section
  let yPos = 200;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryBlue);
  doc.text("Un écosystème complet et interconnecté", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  
  const features = [
    "✓ Chauffeurs indépendants avec outils de gestion complets",
    "✓ Gestionnaires de flotte avec dispatch intelligent",
    "✓ Entreprises avec réservation simplifiée",
    "✓ Collaborateurs avec suivi des notes de frais",
    "✓ Partenariats équitables entre tous les acteurs",
  ];
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...darkText);
  
  features.forEach((feature) => {
    doc.text(feature, margin + 10, yPos);
    yPos += 8;
  });

  // Footer
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("www.solocab.fr", pageWidth / 2, pageHeight - 12, { align: "center" });

  // ========== PAGE 2 - ACTORS DETAIL ==========
  doc.addPage();
  
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Header
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 20, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("LES ACTEURS DE L'ÉCOSYSTÈME", pageWidth / 2, 13, { align: "center" });

  yPos = 35;
  
  const actorDetails = [
    {
      title: "🚗 CHAUFFEURS VTC",
      color: emerald,
      points: [
        "Gestion complète de leur activité",
        "Tarification personnalisée par ville/secteur",
        "QR Code unique pour acquisition clients",
        "Partenariats avec gestionnaires",
        "Outils CRM et fidélisation",
      ]
    },
    {
      title: "📊 GESTIONNAIRES DE FLOTTE",
      color: purple,
      points: [
        "Dispatch intelligent des courses",
        "Gestion des chauffeurs salariés et partenaires",
        "Contrats B2B avec entreprises",
        "Tableau de bord analytique",
        "Frais de transaction transparente",
      ]
    },
    {
      title: "🏢 ENTREPRISES",
      color: orange,
      points: [
        "Réservation simplifiée pour collaborateurs",
        "Facturation centralisée",
        "Choix entre chauffeurs ou flottes",
        "Budget mensuel par employé",
        "Suivi temps réel des courses",
      ]
    },
    {
      title: "👥 COLLABORATEURS",
      color: rose,
      points: [
        "Réservation via invitation",
        "Notes de frais automatiques",
        "Historique des trajets",
        "Application mobile dédiée",
        "Validation par l'entreprise",
      ]
    },
  ];

  actorDetails.forEach((actor, index) => {
    const colX = index % 2 === 0 ? margin : pageWidth / 2 + 5;
    const rowY = yPos + Math.floor(index / 2) * 70;
    const boxWidth = contentWidth / 2 - 5;
    
    // Box background
    doc.setFillColor(250, 250, 255);
    doc.roundedRect(colX, rowY, boxWidth, 65, 3, 3, "F");
    
    // Title bar
    doc.setFillColor(...actor.color);
    doc.roundedRect(colX, rowY, boxWidth, 12, 3, 3, "F");
    doc.rect(colX, rowY + 6, boxWidth, 6, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(actor.title, colX + boxWidth / 2, rowY + 8, { align: "center" });
    
    // Points
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    
    actor.points.forEach((point, i) => {
      doc.text("• " + point, colX + 5, rowY + 20 + i * 8);
    });
  });

  // Vision statement
  yPos = 185;
  doc.setFillColor(...lightBlue);
  doc.roundedRect(margin, yPos, contentWidth, 35, 5, 5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryBlue);
  doc.text("Notre Vision", pageWidth / 2, yPos + 12, { align: "center" });
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.text("« Pour un monde VTC plus humain et solidaire »", pageWidth / 2, yPos + 25, { align: "center" });

  // Call to action
  yPos = 235;
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(margin + 20, yPos, contentWidth - 40, 25, 5, 5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Rejoignez l'écosystème SoloCab !", pageWidth / 2, yPos + 10, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Inscription gratuite sur www.solocab.fr", pageWidth / 2, yPos + 19, { align: "center" });

  // Footer
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("SASU SoloCab | RCS Paris 994 176 576 | contact@solocab.fr", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Save
  doc.save("Flyer_Ecosysteme_SoloCab.pdf");
};
