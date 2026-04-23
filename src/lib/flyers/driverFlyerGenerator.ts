import jsPDF from "jspdf";

export const generateDriverFlyer = async () => {
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
  const emerald: [number, number, number] = [16, 185, 129];
  const darkText: [number, number, number] = [30, 30, 40];
  const grayText: [number, number, number] = [100, 100, 110];
  const lightBg: [number, number, number] = [248, 250, 255];

  // ========== PAGE 1 ==========
  
  // Header background
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 70, "F");

  // Gold accent
  doc.setDrawColor(...accentGold);
  doc.setLineWidth(3);
  doc.line(0, 70, pageWidth, 70);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("CHAUFFEUR VTC ?", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(18);
  doc.setTextColor(...accentGold);
  doc.text("Rejoignez SoloCab", pageWidth / 2, 40, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("La plateforme qui vous appartient vraiment", pageWidth / 2, 55, { align: "center" });

  // Main benefits section
  let yPos = 85;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryBlue);
  doc.text("Vos Avantages Exclusifs", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;

  const benefits = [
    {
      icon: "💰",
      title: "Zéro Frais de transaction sur vos Courses",
      desc: "Gardez 100% de vos revenus. Aucuns frais de transaction sur les courses que vous gérez directement avec vos clients."
    },
    {
      icon: "📱",
      title: "QR Code Personnel",
      desc: "Chaque client qui scanne votre QR Code devient VOTRE client. Fidélisation garantie sans intermédiaire."
    },
    {
      icon: "💳",
      title: "Tarification Libre",
      desc: "Définissez vos propres tarifs par ville, secteur, horaires. C'est VOUS qui décidez de votre valeur."
    },
    {
      icon: "🤝",
      title: "Partenariats Gagnant-Gagnant",
      desc: "Partagez des courses avec d'autres chauffeurs ou recevez des missions de gestionnaires de flotte."
    },
    {
      icon: "📊",
      title: "Outils de Gestion Complets",
      desc: "CRM clients, historique des courses, statistiques, campagnes marketing - tout inclus."
    },
    {
      icon: "🏢",
      title: "Contrats B2B",
      desc: "Signez des contrats avec des entreprises directement. Clientèle régulière et paiements sécurisés."
    },
  ];

  benefits.forEach((benefit, index) => {
    // Benefit box
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, yPos, contentWidth, 25, 3, 3, "F");
    
    // Icon area
    doc.setFillColor(...emerald);
    doc.roundedRect(margin, yPos, 20, 25, 3, 3, "F");
    doc.rect(margin + 10, yPos, 10, 25, "F");
    
    doc.setFontSize(14);
    doc.text(benefit.icon, margin + 10, yPos + 15, { align: "center" });
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkText);
    doc.text(benefit.title, margin + 25, yPos + 9);
    
    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    const descLines = doc.splitTextToSize(benefit.desc, contentWidth - 30);
    doc.text(descLines, margin + 25, yPos + 16);
    
    yPos += 28;
  });

  // Footer CTA
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 30, pageWidth, 30, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Inscription GRATUITE", pageWidth / 2, pageHeight - 18, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("www.solocab.fr", pageWidth / 2, pageHeight - 8, { align: "center" });

  // ========== PAGE 2 ==========
  doc.addPage();
  
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Header
  doc.setFillColor(...emerald);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("POURQUOI CHOISIR SOLOCAB ?", pageWidth / 2, 16, { align: "center" });

  yPos = 40;

  // Comparison table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryBlue);
  doc.text("Comparatif avec les autres plateformes", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;

  // Table header
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, yPos, contentWidth, 10, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Fonctionnalité", margin + 50, yPos + 7, { align: "center" });
  doc.text("Autres", margin + 115, yPos + 7, { align: "center" });
  doc.text("SoloCab", margin + 160, yPos + 7, { align: "center" });
  
  yPos += 10;

  const comparisons = [
    { feature: "Frais de transaction sur courses", others: "15-25%", solocab: "0%" },
    { feature: "Vos clients restent vos clients", others: "❌", solocab: "✓" },
    { feature: "Tarifs personnalisables", others: "❌", solocab: "✓" },
    { feature: "Contrats B2B directs", others: "❌", solocab: "✓" },
    { feature: "Partage entre chauffeurs", others: "❌", solocab: "✓" },
    { feature: "QR Code personnel", others: "❌", solocab: "✓" },
    { feature: "CRM intégré", others: "❌", solocab: "✓" },
    { feature: "Support dédié", others: "Limité", solocab: "✓ 24/7" },
  ];

  comparisons.forEach((row, index) => {
    const bgColor = index % 2 === 0 ? lightBg : [255, 255, 255] as [number, number, number];
    doc.setFillColor(...bgColor);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "normal");
    doc.text(row.feature, margin + 50, yPos + 5.5, { align: "center" });
    
    doc.setTextColor(200, 50, 50);
    doc.text(row.others, margin + 115, yPos + 5.5, { align: "center" });
    
    doc.setTextColor(...emerald);
    doc.setFont("helvetica", "bold");
    doc.text(row.solocab, margin + 160, yPos + 5.5, { align: "center" });
    
    yPos += 8;
  });

  // Testimonial box
  yPos += 15;
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, yPos, contentWidth, 40, 5, 5, "F");
  doc.setDrawColor(...accentGold);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, contentWidth, 40, 5, 5, "S");
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  const testimonial = "« Depuis que je suis sur SoloCab, j'ai retrouvé ma liberté de chauffeur indépendant. Mes clients me connaissent, je fixe mes tarifs, et je ne dépends plus d'algorithmes opaques. »";
  const testLines = doc.splitTextToSize(testimonial, contentWidth - 20);
  doc.text(testLines, margin + 10, yPos + 12);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...primaryBlue);
  doc.text("— Un chauffeur SoloCab", margin + 10, yPos + 32);

  // Steps to join
  yPos += 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryBlue);
  doc.text("Comment rejoindre SoloCab ?", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 12;

  const steps = [
    { num: "1", text: "Inscrivez-vous gratuitement sur www.solocab.fr" },
    { num: "2", text: "Téléchargez vos documents (carte VTC, assurance...)" },
    { num: "3", text: "Personnalisez votre profil et vos tarifs" },
    { num: "4", text: "Recevez votre QR Code et commencez !" },
  ];

  steps.forEach((step) => {
    // Step number circle
    doc.setFillColor(...primaryBlue);
    doc.circle(margin + 10, yPos + 3, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(step.num, margin + 10, yPos + 5, { align: "center" });
    
    // Step text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text(step.text, margin + 22, yPos + 5);
    
    yPos += 12;
  });

  // Footer
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...accentGold);
  doc.text("Reprenez le contrôle de votre activité !", pageWidth / 2, pageHeight - 14, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("SASU SoloCab | RCS Paris 994 176 576", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Save
  doc.save("Flyer_Chauffeurs_SoloCab.pdf");
};
