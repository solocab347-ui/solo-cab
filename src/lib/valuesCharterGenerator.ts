import jsPDF from "jspdf";

export const generateValuesCharter = async (t: (key: string) => string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [25, 118, 210];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Add decorative header border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(2);
  doc.line(margin, 15, pageWidth - margin, 15);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.text("CHARTE D'ENGAGEMENTS", pageWidth / 2, 35, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.setTextColor(...darkColor);
  doc.text("SoloCab", pageWidth / 2, 45, { align: "center" });

  // Description
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...grayColor);
  const subtitle = "La vision de SoloCab pour un monde VTC plus humain et solidaire";
  doc.text(subtitle, pageWidth / 2, 55, { align: "center" });

  // Decorative line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, 62, pageWidth - margin - 30, 62);

  let yPosition = 75;

  // Engagements
  const engagements = [
    {
      title: "1. L'Humain Avant le Profit",
      text: "SoloCab s'engage à toujours placer les intérêts des chauffeurs, gestionnaires et clients avant la recherche du profit. Chaque décision est guidée par son impact sur les personnes.",
    },
    {
      title: "2. La Technologie au Service de l'Humain",
      text: "La technologie doit servir l'humain et non l'inverse. Nos outils sont conçus pour simplifier le quotidien des professionnels du VTC, pas pour les asservir à des algorithmes.",
    },
    {
      title: "3. Les Meilleurs Outils Technologiques",
      text: "SoloCab s'engage à mettre à disposition les outils les plus performants et innovants pour accompagner le développement des chauffeurs et gestionnaires de flotte.",
    },
    {
      title: "4. Visibilité pour Tous les Acteurs",
      text: "Nous nous engageons à donner de la visibilité aux chauffeurs et gestionnaires pour leur permettre d'acquérir de nouveaux clients et développer leur activité.",
    },
    {
      title: "5. Relations Saines entre Partenaires",
      text: "SoloCab s'engage à créer et maintenir des relations saines, équilibrées et transparentes entre tous les collaborateurs et partenaires de la plateforme.",
    },
    {
      title: "6. L'Union Face à la Confusion",
      text: "Là où les grandes plateformes ont semé la confusion et la division, SoloCab s'engage à créer de l'union et de la solidarité entre les professionnels du VTC.",
    },
    {
      title: "7. Partenariats Gagnant-Gagnant",
      text: "Nos partenariats sont conçus pour bénéficier autant au chauffeur qui envoie qu'à celui qui reçoit. Fini l'esprit de compétition, place à l'esprit d'union et de partage.",
    },
    {
      title: "8. Écoute des Travailleurs",
      text: "SoloCab s'engage à maintenir un dialogue permanent avec les organisations syndicales et représentants des travailleurs pour tout changement majeur.",
    },
    {
      title: "9. Fidélité à Nos Valeurs",
      text: "SoloCab s'engage à rester fidèle à ces valeurs fondamentales, quelles que soient les pressions du marché. Cette charte en est le témoignage officiel.",
    },
  ];

  doc.setFont("helvetica", "normal");

  engagements.forEach((engagement, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 25;
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(engagement.title, margin, yPosition);

    yPosition += 6;

    // Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    
    const splitText = doc.splitTextToSize(engagement.text, contentWidth);
    doc.text(splitText, margin, yPosition);
    
    yPosition += splitText.length * 5 + 8;
  });

  // Add final section
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 25;
  }

  // Footer box
  yPosition = Math.max(yPosition, pageHeight - 55);
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPosition, contentWidth, 40, 3, 3);

  // Official stamp text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Document Officiel SoloCab", pageWidth / 2, yPosition + 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(
    "Ces engagements constituent la promesse de SoloCab envers tous les acteurs du VTC.",
    pageWidth / 2,
    yPosition + 20,
    { align: "center" }
  );
  
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Document généré le ${date}`, pageWidth / 2, yPosition + 28, { align: "center" });

  // Footer line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(2);
  doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

  // Website
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text("www.solocab.fr", pageWidth / 2, pageHeight - 5, { align: "center" });

  // Save the PDF
  doc.save("Charte_Engagements_SoloCab.pdf");
};
