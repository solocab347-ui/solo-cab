import jsPDF from "jspdf";

export const generateCompanyFlyer = async () => {
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
  const orange: [number, number, number] = [249, 115, 22];
  const darkText: [number, number, number] = [30, 30, 40];
  const grayText: [number, number, number] = [100, 100, 110];
  const lightBg: [number, number, number] = [248, 250, 255];
  const lightOrange: [number, number, number] = [255, 247, 237];

  // ========== PAGE 1 ==========
  
  // Header background with gradient effect
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 75, "F");
  
  // Decorative elements
  doc.setFillColor(0, 62, 145);
  doc.circle(-20, 40, 60, "F");
  doc.circle(pageWidth + 20, 30, 50, "F");

  // Gold accent line
  doc.setDrawColor(...accentGold);
  doc.setLineWidth(3);
  doc.line(0, 75, pageWidth, 75);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("ENTREPRISES", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(...accentGold);
  doc.text("Optimisez vos déplacements professionnels", pageWidth / 2, 42, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("avec SoloCab, la solution VTC intelligente", pageWidth / 2, 58, { align: "center" });

  // Introduction
  let yPos = 90;
  
  doc.setFillColor(...lightOrange);
  doc.roundedRect(margin, yPos, contentWidth, 25, 4, 4, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  const intro = "SoloCab révolutionne la gestion des transports d'entreprise. Une plateforme unique pour réserver, suivre et optimiser tous les déplacements de vos collaborateurs.";
  const introLines = doc.splitTextToSize(intro, contentWidth - 16);
  doc.text(introLines, margin + 8, yPos + 10);

  // Benefits section
  yPos += 40;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryBlue);
  doc.text("Pourquoi choisir SoloCab pour votre entreprise ?", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;

  const benefits = [
    {
      icon: "📋",
      title: "Facturation Centralisée",
      desc: "Un seul interlocuteur, une seule facture mensuelle. Simplifiez votre comptabilité et gardez le contrôle de vos dépenses transport."
    },
    {
      icon: "👥",
      title: "Gestion des Collaborateurs",
      desc: "Invitez vos employés en quelques clics. Définissez des budgets mensuels individuels et suivez leurs déplacements en temps réel."
    },
    {
      icon: "🎯",
      title: "Choix Flexible",
      desc: "Travaillez avec des chauffeurs indépendants ou des flottes structurées. Vous choisissez les partenaires qui correspondent à vos besoins."
    },
    {
      icon: "📊",
      title: "Reporting Complet",
      desc: "Tableaux de bord analytiques, export des données, suivi des dépenses par département ou collaborateur."
    },
    {
      icon: "🔒",
      title: "Sécurité & Conformité",
      desc: "Tous nos chauffeurs sont vérifiés. Documents à jour, assurances valides, conformité RGPD garantie."
    },
  ];

  benefits.forEach((benefit) => {
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "F");
    
    // Icon circle
    doc.setFillColor(...orange);
    doc.circle(margin + 12, yPos + 11, 8, "F");
    doc.setFontSize(12);
    doc.text(benefit.icon, margin + 12, yPos + 13, { align: "center" });
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text(benefit.title, margin + 25, yPos + 8);
    
    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    const descLines = doc.splitTextToSize(benefit.desc, contentWidth - 30);
    doc.text(descLines, margin + 25, yPos + 14);
    
    yPos += 25;
  });

  // Footer
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Demandez une démo : contact@solocab.fr", pageWidth / 2, pageHeight - 12, { align: "center" });

  // ========== PAGE 2 ==========
  doc.addPage();
  
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Header
  doc.setFillColor(...orange);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("FONCTIONNALITÉS ENTREPRISE", pageWidth / 2, 16, { align: "center" });

  yPos = 40;

  // Features grid
  const features = [
    { title: "Réservation Simplifiée", points: ["Interface intuitive", "Réservation immédiate ou programmée", "Gestion des trajets récurrents"] },
    { title: "Gestion Employés", points: ["Invitation par email", "Rôles personnalisables", "Budget mensuel par employé"] },
    { title: "Suivi en Temps Réel", points: ["Position des véhicules", "ETA précise", "Notifications automatiques"] },
    { title: "Rapports & Analytics", points: ["Dépenses par période", "Export comptable", "Statistiques détaillées"] },
  ];

  features.forEach((feature, index) => {
    const colX = index % 2 === 0 ? margin : pageWidth / 2 + 5;
    const rowY = yPos + Math.floor(index / 2) * 50;
    const boxWidth = contentWidth / 2 - 5;
    
    doc.setFillColor(...lightBg);
    doc.roundedRect(colX, rowY, boxWidth, 45, 3, 3, "F");
    
    doc.setFillColor(...primaryBlue);
    doc.roundedRect(colX, rowY, boxWidth, 12, 3, 3, "F");
    doc.rect(colX, rowY + 6, boxWidth, 6, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(feature.title, colX + boxWidth / 2, rowY + 8, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    
    feature.points.forEach((point, i) => {
      doc.text("✓ " + point, colX + 5, rowY + 20 + i * 7);
    });
  });

  // Pricing section
  yPos = 150;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryBlue);
  doc.text("Une Offre Adaptée à Vos Besoins", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;

  // Pricing boxes
  const plans = [
    { name: "PME", price: "Gratuit", features: ["Jusqu'à 10 collaborateurs", "Facturation mensuelle", "Support email"] },
    { name: "ETI", price: "Sur mesure", features: ["Collaborateurs illimités", "API disponible", "Account manager dédié"] },
  ];

  const planWidth = (contentWidth - 20) / 2;
  
  plans.forEach((plan, index) => {
    const x = margin + 10 + index * (planWidth + 10);
    
    if (index === 1) {
      doc.setFillColor(...primaryBlue);
    } else {
      doc.setFillColor(...lightBg);
    }
    doc.roundedRect(x, yPos, planWidth, 55, 5, 5, "F");
    
    if (index === 1) {
      doc.setDrawColor(...accentGold);
      doc.setLineWidth(2);
      doc.roundedRect(x, yPos, planWidth, 55, 5, 5, "S");
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (index === 1) {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...darkText);
    }
    doc.text(plan.name, x + planWidth / 2, yPos + 12, { align: "center" });
    
    doc.setFontSize(16);
    if (index === 1) {
      doc.setTextColor(...accentGold);
    } else {
      doc.setTextColor(...primaryBlue);
    }
    doc.text(plan.price, x + planWidth / 2, yPos + 26, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (index === 1) {
      doc.setTextColor(220, 220, 220);
    } else {
      doc.setTextColor(...grayText);
    }
    
    plan.features.forEach((f, i) => {
      doc.text("• " + f, x + 8, yPos + 35 + i * 6);
    });
  });

  // CTA
  yPos = 230;
  doc.setFillColor(...orange);
  doc.roundedRect(margin + 15, yPos, contentWidth - 30, 30, 5, 5, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Prêt à optimiser vos déplacements ?", pageWidth / 2, yPos + 12, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Contactez-nous : contact@solocab.fr | www.solocab.fr", pageWidth / 2, yPos + 22, { align: "center" });

  // Footer
  doc.setFillColor(...primaryBlue);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("SASU SoloCab | RCS Paris 994 176 576 | 10 rue de Penthièvre, 75008 Paris", pageWidth / 2, pageHeight - 6, { align: "center" });

  // Save
  doc.save("Flyer_Entreprises_SoloCab.pdf");
};
