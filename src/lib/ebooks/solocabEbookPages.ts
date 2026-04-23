import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";
import {
  getPageDims,
  addFooter,
  addChapterPage,
  DocContext,
} from "./solocabEbookHelpers";

const c = ebookColors;

// Logo loading helper
const loadImage = async (path: string): Promise<string | null> => {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

let logoDataUrl: string | null = null;
let coverDataUrl: string | null = null;

export const initLogo = async () => {
  [logoDataUrl, coverDataUrl] = await Promise.all([
    loadImage("/images/solocab-academy-logo.png"),
    loadImage("/images/ebook-cover.png"),
  ]);
};

/** Add logo to a page at specified position */
const addLogo = (doc: jsPDF, x: number, y: number, size = 20) => {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", x, y, size, size);
    } catch { /* silent fail */ }
  }
};

// ========== COVER ==========
export const addCover = (doc: jsPDF) => {
  const { w, h } = getPageDims(doc);

  if (coverDataUrl) {
    try {
      // Dark background behind margins
      doc.setFillColor(...c.darkBlue);
      doc.rect(0, 0, w, h, "F");

      // Add cover image with margins so PDF viewers don't clip it
      const marginTop = 10;
      const marginBottom = 10;
      const marginSide = 8;
      const imgW = w - marginSide * 2;
      const imgH = h - marginTop - marginBottom;
      doc.addImage(coverDataUrl, "PNG", marginSide, marginTop, imgW, imgH);
      return;
    } catch { /* fall through to generated cover */ }
  }

  // Fallback: generated cover if image fails to load
  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");
  addLogo(doc, w / 2 - 18, 30, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...c.lightViolet);
  doc.text("SOLOCAB ACADEMY", w / 2, 78, { align: "center" });
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(40, 85, w - 40, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text("L'ILLUSION", w / 2, 118, { align: "center" });
  doc.text("DES", w / 2, 138, { align: "center" });
  doc.text("APPLICATIONS", w / 2, 158, { align: "center" });
  doc.setFillColor(28, 48, 95);
  doc.roundedRect(35, 170, w - 70, 30, 5, 5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...c.lightViolet);
  doc.text("Comprendre le système pour reprendre", w / 2, 183, { align: "center" });
  doc.text("le contrôle de son activité", w / 2, 194, { align: "center" });
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(40, h - 80, w - 40, h - 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...c.lightViolet);
  doc.text("www.solocab.fr | contact@solocab.fr", w / 2, h - 60, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 220);
  doc.text("Édition 2026 — Offert par SoloCab Academy", w / 2, h - 48, { align: "center" });
  doc.link(35, h - 68, w - 70, 14, { url: "https://www.solocab.fr" });
};
export const addTableOfContents = (doc: jsPDF) => {
  doc.addPage();
  const { w, margin } = getPageDims(doc);

  // Logo at top
  addLogo(doc, w / 2 - 12, 18, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...c.deepBlue);
  doc.text("SOMMAIRE", w / 2, 55, { align: "center" });

  // Violet underline
  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 30, 60, w / 2 + 30, 60);

  const chapters = [
    { label: "Introduction", title: "La révolution qui semblait évidente" },
    { label: "Partie 1", title: "Une transformation qui semblait évidente" },
    { label: "Partie 2", title: "Comprendre le modèle économique" },
    { label: "Partie 3", title: "L'évolution du rapport de force" },
    { label: "Partie 4", title: "La dépendance invisible" },
    { label: "Partie 5", title: "L'illusion du flux" },
    { label: "Partie 6", title: "Les conséquences économiques" },
    { label: "Partie 7", title: "Les stratégies des plateformes" },
    { label: "Partie 8", title: "La perception d'injustice" },
    { label: "Partie 9", title: "Construire sa clientèle" },
    { label: "Partie 10", title: "Le modèle hybride" },
    { label: "Partie 11", title: "La dimension stratégique" },
    { label: "Partie 12", title: "L'avenir du métier" },
    { label: "Partie 13", title: "Le changement de paradigme" },
    { label: "Partie 14", title: "Conclusion manifeste" },
    { label: "Partie 15", title: "Plan d'action" },
    { label: "Partie 16", title: "Au-delà de la compréhension" },
    { label: "", title: "Message de l'auteur & Manifeste" },
  ];

  let y = 74;
  chapters.forEach((ch) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...c.softViolet);
    doc.text(ch.label, margin + 2, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...c.bodyText);
    doc.text(ch.title, margin + 32, y);

    doc.setDrawColor(...c.softBlue);
    doc.setLineWidth(0.2);
    const textEnd = margin + 32 + doc.getTextWidth(ch.title) + 4;
    doc.line(textEnd, y - 0.5, w - margin, y - 0.5);

    y += 12.5;
  });

  addFooter(doc, 2);
};

// ========== INTRODUCTION ==========
export const addIntroduction = (doc: jsPDF): number => {
  addChapterPage(doc, 0, "Introduction", "La révolution qui semblait évidente", 3, logoDataUrl);

  doc.addPage();
  const ctx = new DocContext(doc, 4);

  ctx.addParagraphs([
    "Pendant longtemps, l'arrivée des applications dans le secteur du transport a été perçue comme une transformation évidente, presque naturelle.",
    "Tout semblait plus simple, plus rapide, plus accessible.",
    "Pour les clients, la promesse était claire : quelques clics suffisaient pour obtenir un véhicule, connaître le prix, suivre son trajet en temps réel et payer automatiquement sans même sortir son portefeuille.",
    "Pour les chauffeurs, c'était l'ouverture d'un marché qui ne nécessitait plus la même structure qu'auparavant.",
  ]);

  ctx.addBulletList([
    "Plus besoin d'une centrale d'appels.",
    "Plus besoin d'une organisation commerciale complexe.",
    "Plus besoin d'un réseau construit sur des années.",
  ]);

  ctx.addParagraphs([
    "Il suffisait d'une application pour commencer à travailler.",
    "Dans les premières années, cette promesse semblait largement tenue.",
    "Le marché était dynamique, la demande forte et l'activité soutenue. Pour beaucoup, cette période a été celle de la découverte d'un nouveau modèle plus flexible et plus accessible.",
    "Une révolution silencieuse était en train de redéfinir la manière dont le service de transport était consommé et produit.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Mais toute révolution technologique transforme aussi les équilibres économiques et la perception du métier.",
    "Avec le temps, certaines questions commencent à émerger.",
  ]);

  ctx.addBulletList([
    "Qui contrôle réellement l'accès au marché ?",
    "Qui définit les règles économiques ?",
    "Qui possède la relation client ?",
    "Qui capte réellement la valeur créée ?",
  ]);

  ctx.addParagraphs([
    "Ces questions ne remettent pas en cause l'utilité des plateformes.",
    "Mais elles invitent à regarder le système avec plus de recul.",
    "Car derrière la simplicité apparente se cache un modèle économique précis, avec ses intérêts, ses dynamiques et ses équilibres.",
    "Et lorsque l'on commence à analyser ces dynamiques, la réalité apparaît plus nuancée que la perception initiale.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Ce livre n'a pas pour objectif de critiquer ni d'opposer de manière caricaturale.",
    "Il propose simplement de comprendre.",
  ]);

  ctx.addBulletList([
    "Comprendre les mécanismes.",
    "Comprendre les dynamiques.",
    "Comprendre la place réelle du professionnel.",
  ]);

  ctx.addParagraphs([
    "Car lorsque la compréhension devient claire, la manière de voir le métier change profondément.",
    "On ne subit plus uniquement un système.",
    "On commence à percevoir ses marges de manœuvre, ses possibilités et son potentiel réel.",
    "Ce livre est une invitation à prendre du recul. À regarder au-delà de l'interface. À observer ce qui structure réellement le marché. À comprendre ce qui se joue en profondeur.",
  ]);

  ctx.addQuote("Qui possède réellement le pouvoir ? Et c'est peut-être là que commence la véritable réflexion.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 1 ==========
export const addPartie1 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 1, "Une transformation qui semblait évidente", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "L'arrivée des applications a marqué un tournant majeur dans l'histoire du transport.",
    "Pour la première fois, la technologie permettait une mise en relation instantanée entre un besoin et un service, à une échelle jamais atteinte auparavant.",
    "Ce changement a profondément transformé la perception du métier, aussi bien du côté des clients que du côté des chauffeurs.",
    "Du jour au lendemain, commander un véhicule devenait aussi simple que commander un repas.",
    "La promesse était puissante :",
  ]);

  ctx.addBulletList(["rapidité", "simplicité", "transparence", "accessibilité"]);

  ctx.addParagraphs([
    "Tout semblait aller dans le sens du progrès.",
    "Et pendant un temps, cette perception était largement partagée.",
    "Les applications ont permis d'ouvrir le marché, de fluidifier la demande et de simplifier l'accès au métier pour de nombreux professionnels.",
    "Elles ont apporté une expérience utilisateur nouvelle, plus fluide, plus moderne et plus intuitive.",
    "Pour les clients, c'était une amélioration évidente. Pour les chauffeurs, c'était une opportunité.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Mais toute transformation profonde modifie aussi les équilibres économiques, souvent de manière progressive et parfois imperceptible au départ.",
    "Car derrière la simplicité d'une interface se cache toujours une structure plus complexe.",
    "Lorsque l'on observe cette évolution avec du recul, on réalise que la transformation n'a pas seulement été technologique. Elle a aussi été structurelle.",
    "Avant l'arrivée des plateformes, le marché était composé d'une multitude d'acteurs indépendants, de réseaux locaux et de centrales de réservation.",
    "La demande était répartie, fragmentée, parfois difficile à capter, mais elle appartenait en grande partie à ceux qui exerçaient le métier.",
    "Avec l'arrivée des applications, une grande partie de cette demande s'est progressivement concentrée autour de quelques canaux dominants.",
    "Ce phénomène de concentration est un mécanisme naturel dans les marchés technologiques.",
    "Plus un outil est utilisé, plus il devient incontournable. Et plus il devient incontournable, plus il acquiert de l'influence sur la manière dont le marché fonctionne.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Cette concentration n'est pas visible au quotidien. Elle se construit progressivement, à mesure que les habitudes évoluent.",
    "Les clients prennent l'habitude d'utiliser une application plutôt qu'un autre canal. Les chauffeurs prennent l'habitude de se connecter pour recevoir des courses plutôt que de développer d'autres sources d'activité.",
    "Petit à petit, le centre de gravité du marché se déplace.",
    "Et lorsque l'accès à la demande passe majoritairement par un seul canal, ce canal acquiert naturellement un pouvoir structurant.",
    "Il devient capable de définir les règles du jeu, d'influencer les prix, d'orienter les conditions et d'imposer un cadre.",
    "Ce phénomène n'est pas spécifique au transport. On le retrouve dans de nombreux secteurs transformés par les plateformes.",
    "Mais dans un métier où la valeur est créée par un service humain, cette transformation prend une dimension particulière.",
    "Car la perception du métier évolue avec elle.",
    "Au départ, le chauffeur voit l'application comme un outil qui lui apporte des clients. Puis, avec le temps, l'application devient le canal principal, parfois unique, d'accès à la demande.",
    "Ce changement de perspective est subtil, mais il modifie profondément la manière dont l'activité est vécue.",
    "On ne parle plus seulement d'un outil. On parle d'un environnement.",
    "Et lorsque l'environnement devient incontournable, il influence naturellement les comportements, les décisions et la manière de travailler.",
    "Cette transformation s'est faite progressivement, sans rupture visible. Elle a accompagné l'évolution des usages, l'amélioration des technologies et l'adoption massive des smartphones.",
    "Et parce qu'elle s'est faite progressivement, elle a été largement acceptée comme une évolution naturelle du marché.",
    "Mais comprendre qu'une transformation est naturelle ne signifie pas qu'elle est neutre.",
    "Elle redéfinit toujours les équilibres, les rôles et la répartition de la valeur.",
    "C'est précisément ce que nous allons explorer dans les prochaines parties.",
    "Car derrière l'évidence apparente se cache une réalité plus nuancée. Et comprendre cette nuance est la première étape pour voir le métier sous un angle différent.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 2 ==========
export const addPartie2 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 2, "Comprendre le modèle économique", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Pour comprendre en profondeur la transformation du secteur, il est essentiel de s'intéresser au fonctionnement du modèle économique des plateformes.",
    "Car derrière l'interface simple et intuitive se trouve une mécanique précise, structurée autour d'objectifs financiers, de stratégies de croissance et d'équilibres économiques.",
    "Une plateforme n'est pas un service public. C'est une entreprise privée, avec des investisseurs, des objectifs de rentabilité et des impératifs de développement.",
    "Son rôle est d'organiser la mise en relation entre une offre et une demande, tout en captant une partie de la valeur générée par cette interaction.",
    "Dans le transport, cette valeur correspond au service rendu au client : le trajet, l'expérience, la qualité de service, la disponibilité, la relation humaine.",
    "Cette valeur est produite concrètement par le chauffeur.",
    "La plateforme, elle, intervient comme intermédiaire technologique. Elle fournit l'interface, la visibilité, l'accès à la demande et l'organisation du flux.",
    "En échange, elle prélève des frais de transaction sur chaque course.",
    "Au départ, ces frais de transaction est souvent modérée. C'est une stratégie classique dans les modèles de plateforme :",
  ]);

  ctx.addBulletList([
    "attirer un maximum d'utilisateurs",
    "favoriser la croissance",
    "atteindre une masse critique",
  ]);

  ctx.addParagraphs([
    "Dans cette phase, l'objectif principal n'est pas la rentabilité immédiate, mais l'expansion rapide du marché.",
    "Plus il y a de chauffeurs, plus le service est disponible. Plus le service est disponible, plus il attire de clients. Plus il attire de clients, plus il devient indispensable.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Une fois cette masse critique atteinte, la dynamique évolue.",
    "La priorité d'une entreprise en phase de maturité devient naturellement l'optimisation de sa rentabilité.",
    "Les frais de transaction peuvent évoluer. Les conditions peuvent changer. Les règles peuvent être ajustées.",
    "Ces évolutions ne sont pas nécessairement perçues immédiatement comme problématiques. Elles s'inscrivent dans la logique économique d'une entreprise qui cherche à améliorer ses performances financières.",
    "Mais du point de vue du professionnel, la perception peut être différente.",
    "Car la valeur produite reste la même — le service rendu au client — tandis que la part captée par l'intermédiaire peut augmenter.",
    "C'est là que se crée parfois un sentiment de déséquilibre.",
    "Le chauffeur supporte les coûts opérationnels :",
  ]);

  ctx.addBulletList([
    "le véhicule", "le carburant", "l'entretien", "les assurances",
    "le temps", "la fatigue", "le risque",
  ]);

  ctx.addParagraphs([
    "La plateforme, elle, capte une part de la transaction sans supporter directement ces contraintes opérationnelles.",
    "Tant que l'équilibre est perçu comme juste, le système fonctionne sans tension majeure.",
  ]);

  ctx.addQuote("La répartition de la valeur est-elle équilibrée ?");

  ctx.addParagraphs([
    "Cette question n'est pas idéologique. Elle est économique.",
    "Elle renvoie à la manière dont la valeur est créée et distribuée dans un système.",
    "Comprendre ce mécanisme permet de prendre du recul. Il ne s'agit pas de remettre en cause l'existence des plateformes, mais de comprendre leur logique.",
    "Car toute entreprise agit en fonction de ses intérêts économiques. Et comprendre ces intérêts permet de mieux anticiper les évolutions possibles du modèle.",
    "C'est à partir de cette compréhension que le regard sur le métier commence à évoluer.",
    "On ne voit plus uniquement l'application comme un outil, mais comme un acteur économique à part entière, avec ses objectifs, ses contraintes et ses stratégies.",
    "Et cette prise de conscience change profondément la manière d'analyser la relation entre le professionnel et la plateforme.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 3 ==========
export const addPartie3 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 3, "L'évolution du rapport de force", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "À mesure que les plateformes se développent et deviennent des acteurs centraux du marché, le rapport de force évolue naturellement.",
    "Au départ, la relation entre le chauffeur et la plateforme est perçue comme un partenariat. L'un apporte son service, l'autre apporte de la visibilité et de la demande.",
    "Cette relation semble équilibrée, car chacun y trouve un avantage immédiat.",
    "Mais avec le temps, à mesure que la demande se concentre sur quelques applications dominantes, l'équilibre peut évoluer.",
    "Celui qui contrôle l'accès au client acquiert naturellement une influence majeure sur le fonctionnement du marché.",
    "Ce phénomène n'est pas spécifique au transport. Il est observable dans tous les secteurs où un intermédiaire technologique devient le principal canal d'accès à la demande.",
    "Lorsque la majorité des clients utilisent un même outil, cet outil devient capable d'orienter les conditions dans lesquelles le service est proposé.",
    "Il peut définir les règles, ajuster les paramètres et influencer les dynamiques économiques.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Pour le professionnel, cette évolution peut être perçue comme un changement progressif de position.",
    "On passe d'une relation perçue comme équilibrée à une relation où les décisions importantes sont prises à un niveau stratégique auquel le professionnel n'a pas directement accès.",
    "Les évolutions de tarifs, les modifications des conditions d'utilisation, les ajustements des règles se font généralement de manière descendante.",
    "Le chauffeur les découvre, s'y adapte, mais ne participe pas réellement à leur définition.",
    "Cette situation n'est pas nécessairement intentionnelle. Elle est structurelle dans un modèle de plateforme.",
    "Mais elle peut créer un sentiment de perte de contrôle sur certains paramètres essentiels de l'activité.",
    "Lorsque l'on dépend majoritairement d'un seul canal pour accéder à la demande, la capacité d'influence individuelle devient limitée.",
    "Et c'est précisément à ce moment que la perception du rapport de force commence à évoluer.",
    "Certains professionnels ressentent un décalage entre leur rôle réel — produire le service — et leur capacité à influencer les règles du système dans lequel ils évoluent.",
    "Ce décalage peut générer un sentiment d'incertitude, voire de frustration.",
    "Mais au-delà du ressenti, il traduit surtout une transformation structurelle du marché.",
    "Comprendre cette transformation permet de prendre du recul. Il ne s'agit pas d'opposer, mais d'analyser.",
    "Car dans tout système économique, celui qui contrôle l'accès à la demande détient une influence importante sur la répartition de la valeur.",
    "Et reconnaître cette réalité permet de mieux comprendre les dynamiques qui façonnent aujourd'hui le secteur.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 4 ==========
export const addPartie4 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 4, "La dépendance invisible", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "La dépendance ne commence jamais par une contrainte visible. Elle commence presque toujours par le confort.",
    "Lorsqu'un système fonctionne bien, qu'il apporte de la simplicité, de la fluidité et une forme de sécurité, il devient naturellement rassurant.",
    "Dans le cas des plateformes, cette sécurité prend la forme d'un flux constant de courses.",
    "On se connecte, et l'activité arrive. On travaille, et la journée s'organise autour de ce flux.",
    "Ce fonctionnement crée une habitude. Et avec l'habitude, une forme de confiance s'installe.",
    "Cette confiance n'est pas irrationnelle. Elle repose sur une expérience réelle : le système fonctionne, les courses arrivent, l'activité est possible.",
    "Mais avec le temps, cette habitude peut aussi modifier certains réflexes stratégiques.",
    "Lorsque la demande est fournie en continu, la nécessité de construire d'autres sources d'activité peut sembler moins urgente.",
    "Pourquoi chercher ailleurs lorsque le flux est déjà là ? Pourquoi développer un réseau lorsque l'activité est immédiate ? Pourquoi réfléchir à une stratégie long terme lorsque le court terme fonctionne ?",
    "Ces questions sont naturelles. Elles traduisent une adaptation logique à un environnement qui semble stable et efficace.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Mais c'est précisément là que la dépendance commence à s'installer, souvent de manière imperceptible.",
    "Car à mesure que l'on s'habitue à un système, on peut progressivement réduire sa capacité à fonctionner en dehors de ce système.",
  ]);

  ctx.addBulletList([
    "On développe moins d'autres canaux.",
    "On construit moins de relations directes.",
    "On investit moins dans des alternatives.",
  ]);

  ctx.addParagraphs([
    "L'activité devient alors fortement liée à un flux externe. Et tant que ce flux reste stable, cette dépendance reste invisible.",
    "Elle ne devient perceptible que lorsque quelque chose change.",
  ]);

  ctx.addBulletList([
    "Une modification des conditions.",
    "Une baisse d'activité.",
    "Une évolution des règles.",
  ]);

  ctx.addParagraphs([
    "C'est souvent dans ces moments que l'on prend conscience du degré de dépendance que l'on a développé.",
    "Mais la dépendance n'est pas uniquement économique. Elle est aussi psychologique.",
    "Lorsqu'un système structure notre quotidien, notre organisation et notre manière de travailler, il devient une référence implicite.",
    "On finit par considérer son fonctionnement comme la norme. Et cette normalisation peut rendre plus difficile la projection vers d'autres modèles.",
    "Comprendre ce mécanisme ne signifie pas qu'il faut rejeter le système. Il signifie simplement qu'il est utile de prendre conscience de la manière dont il influence nos comportements et nos choix.",
    "Car la prise de conscience est toujours la première étape vers la liberté stratégique.",
    "Lorsqu'on comprend les mécanismes de dépendance, on peut commencer à réfléchir à la manière de diversifier, d'équilibrer et de structurer son activité différemment.",
    "Cette réflexion n'est pas une remise en cause. C'est une évolution.",
    "Elle permet de passer d'une posture passive à une posture plus consciente.",
    "Et c'est précisément ce changement de posture qui ouvre la voie à de nouvelles possibilités.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 5 ==========
export const addPartie5 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 5, "L'illusion du flux", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Le flux est probablement l'un des éléments les plus rassurants dans un modèle basé sur les plateformes.",
    "Il donne le sentiment que l'activité est toujours disponible, que la demande est constante et que le travail ne manque jamais.",
    "Se connecter devient presque synonyme de travailler.",
    "Cette sensation est puissante, car elle apporte une forme de sécurité immédiate.",
    "On sait que l'on va recevoir des courses. On sait que la journée peut être remplie. On sait que l'activité est possible.",
    "Mais derrière cette impression de continuité se cache une réalité plus subtile.",
    "Les plateformes n'ont pas créé le besoin de mobilité. Le besoin de se déplacer existe depuis toujours.",
    "Ce qu'elles ont créé, c'est une manière plus efficace d'organiser ce besoin.",
    "Elles ont structuré la demande, facilité la mise en relation et fluidifié l'expérience.",
    "Mais le flux lui-même n'est pas une ressource créée par la plateforme. Il est simplement organisé par elle.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Cette distinction est essentielle. Car elle change la manière de percevoir le système.",
    "Si le flux est perçu comme quelque chose qui appartient exclusivement à la plateforme, alors la dépendance semble naturelle.",
    "Mais si le flux est compris comme l'expression d'un besoin existant, alors la perception évolue.",
    "On commence à voir la plateforme comme un canal parmi d'autres, plutôt que comme la source unique de l'activité.",
    "Cette nuance peut sembler théorique, mais elle a des conséquences très concrètes.",
    "Elle ouvre la possibilité d'imaginer d'autres manières d'accéder à la demande.",
    "Elle permet de comprendre que le marché ne se limite pas à un seul canal.",
    "Et surtout, elle rappelle que la valeur du service ne dépend pas uniquement du système qui organise le flux. Elle dépend avant tout du professionnel qui réalise la prestation.",
    "Le flux peut donner l'impression que l'activité est fournie. Mais en réalité, l'activité existe parce que des clients ont un besoin et parce que des professionnels y répondent.",
    "La plateforme n'est qu'un intermédiaire entre ces deux réalités.",
    "Comprendre cette dynamique permet de prendre du recul sur la perception du système.",
    "On ne voit plus le flux comme une ressource extérieure indispensable, mais comme une organisation spécifique d'un besoin plus large.",
    "Cette prise de conscience est souvent le début d'une réflexion plus profonde sur la manière de structurer son activité.",
    "Car lorsqu'on comprend que la demande existe indépendamment du canal, on commence à envisager d'autres possibilités.",
    "On réalise que le flux n'est pas une finalité. C'est un outil.",
    "Et comme tout outil, il peut être utilisé, complété ou équilibré par d'autres approches.",
    "Cette vision ne remet pas en cause l'utilité des plateformes. Elle permet simplement de les replacer dans un cadre plus large, où elles deviennent un élément d'un écosystème plutôt qu'une fondation unique.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 6 ==========
export const addPartie6 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 6, "Les conséquences économiques", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Au fil du temps, de nombreux professionnels commencent à ressentir un décalage entre l'intensité de leur activité et le résultat économique qu'ils en retirent.",
    "Beaucoup travaillent davantage, mais ont le sentiment de gagner moins.",
    "Ce ressenti n'est pas uniquement lié à une perception subjective. Il est souvent le résultat d'une combinaison de facteurs économiques qui évoluent progressivement.",
  ]);

  ctx.addBulletList([
    "L'augmentation des frais de transaction.",
    "L'évolution des tarifs.",
    "La hausse des coûts opérationnels.",
    "La pression concurrentielle.",
  ]);

  ctx.addParagraphs([
    "Pris séparément, chacun de ces éléments peut sembler gérable. Mais ensemble, ils modifient progressivement l'équilibre économique du métier.",
    "Le professionnel supporte l'essentiel des coûts liés à l'activité :",
  ]);

  ctx.addBulletList([
    "Le véhicule.", "Le carburant.", "L'entretien.", "Les assurances.",
    "Les charges.", "Le temps passé.", "La fatigue physique et mentale.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Ces coûts sont concrets, tangibles et immédiats.",
    "La plateforme, de son côté, capte une part de chaque transaction sans supporter directement ces contraintes opérationnelles.",
    "Ce fonctionnement est cohérent avec son rôle d'intermédiaire. Mais lorsque la part captée augmente, l'équilibre perçu peut évoluer.",
    "Certains professionnels ont le sentiment que la rentabilité devient plus difficile à maintenir malgré une activité soutenue.",
    "Ils travaillent plus d'heures pour maintenir un niveau de revenu similaire.",
    "Cette situation peut créer une forme de pression économique permanente.",
    "On travaille pour maintenir l'équilibre, mais sans toujours pouvoir améliorer sa situation.",
    "À long terme, cette dynamique peut générer une incertitude sur la capacité à se projeter.",
    "La question n'est plus seulement de travailler, mais de savoir dans quelles conditions économiques l'activité pourra évoluer.",
    "Cette incertitude n'est pas propre à un individu. Elle reflète une transformation plus large du modèle économique du secteur.",
    "Comprendre ces mécanismes permet de prendre du recul sur les difficultés rencontrées.",
    "Il ne s'agit pas de pointer un responsable, mais d'analyser une structure.",
    "Car dans tout système où la valeur est partagée entre plusieurs acteurs, la perception de l'équilibre est essentielle pour maintenir une relation saine.",
    "Lorsque cet équilibre semble évoluer, la perception du métier change naturellement.",
    "On commence à réfléchir différemment à la manière de structurer son activité, de diversifier ses sources de revenus et de construire une stabilité plus durable.",
    "Cette réflexion marque souvent le début d'une transition vers une approche plus stratégique du métier.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 7 ==========
export const addPartie7 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 7, "Les stratégies des plateformes", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Pour comprendre pleinement l'évolution du secteur, il est essentiel d'observer la manière dont les plateformes se développent dans le temps.",
    "Car leur évolution suit souvent un cycle stratégique assez clair, que l'on retrouve dans de nombreux modèles technologiques.",
    "On peut généralement distinguer plusieurs phases.",
  ]);

  ctx.addSubTitle("La phase de séduction");
  ctx.addParagraphs([
    "Dans les premières années, l'objectif principal est de conquérir le marché. Pour y parvenir, les plateformes mettent en place des conditions attractives.",
  ]);
  ctx.addBulletList([
    "Les frais de transaction sont souvent modérées.",
    "Les incitations financières sont nombreuses.",
    "Les conditions d'entrée sont facilitées.",
  ]);
  ctx.addParagraph("L'objectif est clair : attirer un maximum de chauffeurs et de clients pour atteindre une masse critique. Cette phase est souvent perçue comme très positive.");

  ctx.addSeparator();

  ctx.addSubTitle("La phase de croissance");
  ctx.addParagraphs([
    "Une fois la base d'utilisateurs établie, la plateforme cherche à consolider sa position. Elle améliore son service, renforce son infrastructure et développe sa présence sur le marché.",
    "L'écosystème se structure progressivement autour d'elle. Les habitudes se créent. Les clients adoptent le service. Les chauffeurs s'y connectent quotidiennement.",
    "Le système devient de plus en plus central dans l'organisation du marché.",
  ]);

  ctx.addSubTitle("La phase de domination");
  ctx.addParagraphs([
    "À mesure que la plateforme devient incontournable, elle acquiert une influence importante sur les conditions du marché.",
    "Elle devient le canal principal d'accès à la demande pour une grande partie des professionnels.",
    "C'est à ce moment que le rapport de force évolue de manière plus visible.",
  ]);
  ctx.addBulletList([
    "Les règles peuvent être ajustées.",
    "Les conditions peuvent évoluer.",
    "Les paramètres économiques peuvent être modifiés.",
  ]);

  ctx.addSubTitle("La phase d'optimisation");
  ctx.addParagraphs([
    "Une fois la position dominante consolidée, la priorité devient souvent l'optimisation des performances économiques.",
    "Les plateformes cherchent à améliorer leur rentabilité, à satisfaire leurs investisseurs et à renforcer leur modèle financier.",
    "C'est dans cette phase que certaines décisions peuvent être perçues comme plus contraignantes par les professionnels.",
  ]);

  ctx.addDecorativeElement();

  ctx.addSubTitle("Une logique économique, pas morale");
  ctx.addParagraphs([
    "Il est important de comprendre que ces évolutions ne sont pas nécessairement guidées par une intention négative. Elles sont le résultat d'une logique économique propre aux entreprises technologiques.",
    "Comprendre cette logique permet de replacer les transformations dans un cadre plus large et d'éviter une lecture uniquement émotionnelle.",
    "Cela permet également d'anticiper les évolutions possibles du modèle et d'adapter sa stratégie en conséquence.",
  ]);

  ctx.addSubTitle("La perception du pouvoir");
  ctx.addParagraphs([
    "Lorsque l'on observe ce cycle avec du recul, on comprend que le pouvoir d'une plateforme repose principalement sur sa capacité à organiser l'accès au marché.",
    "Mais ce pouvoir n'existe que parce qu'il est alimenté par deux éléments essentiels : les clients et les chauffeurs.",
    "Sans clients, il n'y a pas de demande. Sans chauffeurs, il n'y a pas de service.",
    "Cette réalité rappelle que le système repose sur un équilibre entre plusieurs acteurs, chacun jouant un rôle indispensable.",
    "Observer les stratégies des plateformes permet de mieux comprendre certaines évolutions qui peuvent sembler difficiles à interpréter lorsqu'on les vit au quotidien.",
    "Cette prise de recul ne vise pas à juger, mais à analyser.",
    "Car comprendre la logique d'un système est toujours la première étape pour pouvoir s'y positionner de manière plus consciente.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 8 ==========
export const addPartie8 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 8, "La perception d'injustice", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Au-delà des mécanismes économiques et des logiques stratégiques, il existe une dimension plus humaine dans la manière dont les professionnels vivent l'évolution du secteur.",
    "Car un marché n'est pas uniquement constitué de chiffres et de modèles économiques. Il est aussi fait de perceptions, de ressentis et d'expériences individuelles.",
    "Avec le temps, de nombreux chauffeurs commencent à exprimer un sentiment difficile à définir précisément, mais qui revient souvent dans les discussions : un sentiment de décalage.",
    "Un décalage entre l'effort fourni et le résultat obtenu. Entre la qualité du service rendu et la reconnaissance perçue. Entre le rôle joué et la position occupée dans le système.",
    "Ce sentiment n'est pas un jugement de valeur. Il est simplement le reflet d'une perception qui évolue à mesure que le système se transforme.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Lorsque l'on travaille avec intensité, que l'on investit du temps, de l'énergie et des ressources, et que l'on a le sentiment que la valeur créée ne se traduit pas pleinement dans le résultat, une forme de frustration peut apparaître.",
    "Cette frustration n'est pas nécessairement dirigée vers un acteur en particulier. Elle traduit un malaise plus profond face à un système dont les règles semblent parfois évoluer indépendamment de ceux qui créent la valeur.",
    "Il est important de comprendre que ce sentiment est normal.",
    "Il est le signe d'une prise de conscience. La prise de conscience que le système ne fonctionne pas uniquement selon une logique de mérite, mais aussi selon une logique de structure.",
    "Dans un modèle de plateforme, la valeur est répartie selon des règles définies par celui qui organise le système, pas nécessairement selon la contribution de chaque acteur.",
    "Reconnaître cette réalité permet de dépasser le sentiment d'injustice pour entrer dans une analyse plus rationnelle.",
    "Car si le système est structurel, alors la réponse doit l'être aussi.",
    "On ne change pas un système en le subissant ou en le critiquant uniquement. On le comprend. Et à partir de cette compréhension, on peut adapter sa stratégie.",
    "Cette posture est exigeante. Elle demande du recul, de la réflexion et parfois un changement de perspective.",
    "Mais elle offre également une forme de liberté : celle de ne plus dépendre uniquement de la perception du système pour définir sa propre valeur.",
    "Le professionnel qui comprend la structure dans laquelle il évolue peut commencer à chercher des leviers d'action.",
    "Il peut identifier les espaces de liberté qui existent à l'intérieur du système. Et surtout, il peut commencer à construire des alternatives.",
    "C'est souvent à partir de ce sentiment de décalage que naît la volonté de faire évoluer son approche du métier.",
    "Non pas en rejetant le système, mais en cherchant à s'y positionner différemment.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 9 ==========
export const addPartie9 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 9, "Construire sa clientèle", "L'alternative commence ici", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Si les parties précédentes ont permis de comprendre les dynamiques du système actuel, cette partie ouvre une perspective différente.",
    "Car comprendre un système ne suffit pas. La véritable transformation commence lorsque l'on commence à agir.",
    "Et l'une des actions les plus puissantes qu'un professionnel puisse entreprendre est de construire sa propre clientèle.",
    "Cette démarche peut sembler ambitieuse, voire complexe. Mais en réalité, elle repose sur des principes simples et accessibles.",
    "Construire sa clientèle, c'est avant tout créer des relations directes avec les personnes que l'on transporte.",
    "C'est passer d'une logique transactionnelle à une logique relationnelle.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Dans un modèle basé sur les plateformes, chaque course est une transaction isolée. Le client commande, le service est rendu, et la relation s'arrête là.",
    "Construire sa clientèle, c'est prolonger cette relation au-delà de la course.",
    "C'est offrir un niveau de service qui donne envie au client de revenir directement, sans passer par un intermédiaire.",
    "Cette approche n'est pas nouvelle. Elle est à la base de tout métier de service depuis toujours.",
    "Ce qui est nouveau, c'est la possibilité de combiner cette approche traditionnelle avec des outils modernes.",
  ]);

  ctx.addBulletList([
    "Un site de réservation personnalisé.",
    "Un système de fidélisation.",
    "Une communication directe avec le client.",
    "Une visibilité locale renforcée.",
  ]);

  ctx.addParagraphs([
    "Ces outils permettent de structurer une clientèle propre tout en conservant la flexibilité des plateformes.",
    "Le professionnel ne choisit pas entre les deux. Il combine les deux.",
    "Et cette combinaison ouvre la voie à un modèle plus équilibré, plus stable et plus durable.",
    "Construire sa clientèle demande du temps. Ce n'est pas un résultat immédiat. C'est un investissement progressif.",
    "Mais chaque client fidélisé est un pas vers une activité plus autonome.",
    "Et avec le temps, cette base de clients devient un actif précieux, qui apporte stabilité et prévisibilité.",
    "La construction d'une clientèle propre n'est pas un rejet du système existant. C'est une évolution naturelle.",
    "Une évolution vers un modèle où le professionnel ne dépend plus d'un seul canal, mais dispose de plusieurs sources d'activité.",
    "Cette diversification est la clé d'une activité plus résiliente et plus maîtrisée.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 10 ==========
export const addPartie10 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 10, "Le modèle hybride", "Combiner le meilleur des deux mondes", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Le modèle hybride est probablement l'approche la plus pragmatique et la plus adaptée à la réalité du marché actuel.",
    "Il repose sur une idée simple : ne pas choisir entre les plateformes et la clientèle directe, mais combiner les deux de manière stratégique.",
    "Les plateformes apportent un flux immédiat et une accessibilité au marché.",
    "Les relations directes avec les clients apportent de la stabilité, de la prévisibilité et une reconnaissance plus personnelle du service.",
    "En combinant ces deux dimensions, le professionnel peut structurer une activité plus équilibrée.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Le modèle hybride permet également de réduire la dépendance à un seul canal.",
    "Lorsque l'activité repose sur plusieurs sources, les variations de l'une sont plus facilement absorbées par les autres.",
    "Cette diversification apporte une forme de sécurité économique et psychologique.",
    "Elle permet de travailler avec plus de sérénité, en sachant que l'activité ne dépend pas d'un seul facteur.",
    "Mais au-delà de la sécurité, le modèle hybride offre surtout une plus grande liberté stratégique.",
    "Le professionnel peut choisir la manière dont il souhaite organiser son activité, en fonction de ses objectifs, de son rythme et de sa vision du métier.",
    "Il peut ajuster son équilibre entre flux immédiat et construction long terme.",
    "Cette capacité d'ajustement est un atout majeur dans un environnement en constante évolution.",
    "Car aucun modèle n'est figé. Le marché évolue, les technologies évoluent, les attentes des clients évoluent.",
    "Et dans ce contexte, la flexibilité devient une compétence essentielle.",
    "Le modèle hybride n'est pas une solution miracle. C'est une approche progressive, qui se construit dans le temps et qui s'adapte à chaque situation individuelle.",
    "Il permet simplement d'aborder le métier avec une vision plus large et plus stratégique.",
    "On ne se limite plus à un seul cadre. On crée un équilibre.",
    "Et cet équilibre ouvre la voie à une activité plus durable et plus maîtrisée.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 11 ==========
export const addPartie11 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 11, "La dimension stratégique", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "À mesure que la compréhension du marché s'approfondit, une nouvelle manière de percevoir le métier commence à émerger.",
    "On ne le voit plus uniquement comme une activité quotidienne, mais comme un projet qui peut être structuré et développé dans le temps.",
    "Cette évolution correspond à un changement de posture.",
    "On passe d'une logique d'exécution à une logique stratégique.",
    "Dans une logique d'exécution, l'objectif principal est de répondre à la demande immédiate. On travaille au jour le jour, en s'adaptant aux conditions et aux opportunités qui se présentent.",
    "Cette approche peut fonctionner à court terme, mais elle rend plus difficile la projection à long terme.",
    "Dans une logique stratégique, la perspective change.",
    "On commence à réfléchir à la direction que l'on souhaite donner à son activité, aux objectifs que l'on souhaite atteindre et aux moyens de structurer son développement.",
    "Cette réflexion ne nécessite pas de transformations radicales. Elle commence souvent par une simple prise de recul.",
  ]);

  ctx.addBulletList([
    "Prendre le temps d'observer son activité.",
    "Analyser ses sources de revenus.",
    "Comprendre ses marges de manœuvre.",
    "Identifier ses priorités.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Cette démarche permet de passer d'une posture réactive à une posture plus consciente.",
    "On ne subit plus uniquement les conditions du marché. On commence à prendre des décisions plus alignées avec sa vision personnelle du métier.",
    "La dimension stratégique ne signifie pas nécessairement complexité. Elle signifie simplement intention.",
    "Avoir une intention claire permet de donner une direction à son activité et d'éviter de naviguer uniquement en fonction des circonstances.",
    "Cette approche apporte également plus de cohérence dans les choix quotidiens. Chaque décision s'inscrit dans une logique plus large, orientée vers un objectif à long terme.",
    "La dimension stratégique permet aussi d'anticiper les évolutions du marché.",
    "En comprenant les dynamiques économiques et les transformations du secteur, on peut mieux s'adapter aux changements et saisir de nouvelles opportunités.",
    "Cette capacité d'adaptation est essentielle dans un environnement en constante évolution.",
    "Car le marché ne reste jamais figé. Les technologies évoluent. Les modèles économiques évoluent. Les attentes des clients évoluent.",
    "Et dans ce contexte, ceux qui adoptent une posture stratégique sont souvent ceux qui parviennent à construire les modèles les plus durables.",
    "La dimension stratégique transforme la relation au métier. On ne se contente plus de travailler. On développe une activité.",
    "Et cette évolution ouvre la voie à une vision plus équilibrée, plus consciente et plus maîtrisée du travail.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 12 ==========
export const addPartie12 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 12, "L'avenir du métier", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Lorsqu'on observe les transformations du secteur avec du recul, une chose apparaît clairement : le métier continue d'évoluer, et il continuera de le faire dans les années à venir.",
    "Les évolutions technologiques, les changements de modèles économiques et les nouvelles attentes des clients redessinent progressivement les contours du marché.",
    "Cette évolution n'est ni bonne ni mauvaise en soi. Elle est simplement le reflet d'un monde en mouvement, où les outils et les usages se transforment en permanence.",
    "Dans ce contexte, l'avenir du métier ne se résume pas à une opposition entre tradition et technologie. Il se construit dans la manière dont les professionnels choisissent de s'adapter à ces transformations.",
    "La technologie continuera de jouer un rôle central. Elle facilitera l'organisation, améliorera l'expérience client et apportera de nouveaux outils pour structurer l'activité.",
    "Mais au-delà des outils, ce qui restera constant, c'est la valeur du service humain.",
  ]);

  ctx.addBulletList([
    "La qualité de l'accueil.",
    "La ponctualité.",
    "Le professionnalisme.",
    "La relation de confiance.",
  ]);

  ctx.addSeparator();

  ctx.addParagraphs([
    "Ces éléments ne peuvent pas être automatisés. Ils reposent sur l'engagement et l'expérience du professionnel.",
    "C'est pourquoi l'avenir du métier ne dépend pas uniquement de la technologie, mais de la manière dont elle est utilisée.",
    "Elle peut être un levier puissant lorsqu'elle est mise au service du professionnel. Elle peut aussi devenir contraignante lorsqu'elle devient la seule structure de l'activité.",
    "Comprendre cette nuance permet d'aborder l'avenir avec plus de sérénité.",
    "Car l'évolution du secteur ouvre aussi de nouvelles opportunités.",
  ]);

  ctx.addBulletList([
    "De nouveaux outils apparaissent.",
    "De nouvelles approches émergent.",
    "De nouvelles manières de structurer son activité deviennent possibles.",
  ]);

  ctx.addParagraphs([
    "Le professionnel qui adopte une posture ouverte et stratégique est souvent mieux préparé à saisir ces opportunités.",
    "Il ne subit pas les transformations. Il s'y adapte. Et parfois même, il les anticipe.",
    "L'avenir du métier ne sera pas uniforme. Certains choisiront de continuer à fonctionner principalement via les plateformes. D'autres développeront davantage leur clientèle. Certains adopteront des modèles hybrides plus structurés.",
    "Cette diversité reflète la richesse du secteur et la multiplicité des parcours possibles.",
    "Mais une chose semble se dessiner progressivement : une évolution vers des modèles plus équilibrés, où la technologie devient un outil au service du professionnel plutôt qu'un cadre unique.",
    "Cette évolution ne se fera pas du jour au lendemain. Elle se construira progressivement, à mesure que les professionnels prendront conscience des différentes possibilités qui s'offrent à eux.",
    "Et c'est précisément cette prise de conscience qui ouvre la voie à un futur plus maîtrisé et plus durable.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 13 ==========
export const addPartie13 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 13, "Le changement de paradigme", "", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Au fil des transformations du secteur, une évolution plus profonde se dessine progressivement.",
    "Au-delà des outils, des modèles économiques et des conditions du marché, c'est la manière même de percevoir le métier qui évolue.",
    "Pendant longtemps, l'activité a été pensée principalement sous l'angle de l'exécution : répondre à la demande, optimiser son temps, maximiser le nombre de courses.",
    "Cette approche reste valable dans un certain contexte, mais elle ne reflète plus entièrement la réalité d'un secteur en mutation.",
    "Un nouveau paradigme commence à émerger.",
    "Un paradigme dans lequel le professionnel n'est plus seulement un exécutant, mais un acteur capable de structurer, de développer et d'orienter son activité.",
  ]);

  ctx.addDecorativeElement();

  ctx.addParagraphs([
    "Ce changement ne se fait pas de manière brutale. Il se construit progressivement, à mesure que la compréhension du système s'approfondit.",
    "On commence à voir le métier sous un angle plus large. On ne parle plus uniquement de courses. On parle d'activité. On parle de relation client. On parle de stratégie. On parle de développement.",
    "Ce changement de perspective modifie profondément la posture professionnelle.",
    "On ne se contente plus de répondre aux conditions du marché. On cherche à comprendre comment y évoluer de manière plus consciente.",
    "Le changement de paradigme repose sur une idée simple : la technologie ne doit pas être une structure qui enferme, mais un outil qui accompagne.",
    "Elle doit faciliter, pas remplacer la réflexion stratégique. Elle doit soutenir, pas limiter la capacité d'évolution.",
    "Dans cette vision, les plateformes ne disparaissent pas. Elles deviennent un élément parmi d'autres dans un écosystème plus large.",
    "Le professionnel peut choisir la manière dont il souhaite les utiliser, en fonction de ses objectifs et de sa vision du métier.",
    "Ce changement de paradigme ouvre la porte à une approche plus équilibrée et plus mature.",
    "On ne cherche plus à opposer les modèles. On cherche à comprendre comment les articuler de manière cohérente.",
    "Cette évolution marque une étape importante dans la maturation du secteur.",
    "Elle reflète une prise de conscience progressive : le métier ne se limite pas à un cadre unique. Il peut évoluer, se structurer et se développer de différentes manières.",
    "Et cette diversité d'approches constitue une richesse pour l'ensemble du secteur.",
    "Le changement de paradigme n'est pas seulement une évolution économique. C'est aussi une évolution culturelle.",
    "Une évolution dans la manière dont les professionnels perçoivent leur rôle, leur valeur et leur capacité à agir sur leur environnement.",
    "C'est souvent à ce moment que l'on commence à envisager l'activité avec une perspective plus large, tournée vers l'avenir.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 14 — CONCLUSION ==========
export const addPartie14 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 14, "Conclusion manifeste", "La fin d'une illusion, le début d'une vision", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Tout au long de ce livre, nous avons exploré une réalité qui, pour beaucoup, reste difficile à définir avec des mots simples.",
    "Une réalité faite de promesses, d'opportunités, mais aussi de transformations profondes dans la manière dont le métier est exercé et perçu.",
    "Nous avons observé comment un modèle innovant a transformé un secteur entier, apportant simplicité et fluidité, tout en redéfinissant progressivement les équilibres économiques et le rapport au travail.",
    "Mais au-delà de l'analyse économique et stratégique, ce livre raconte avant tout une histoire plus personnelle : celle de la manière dont un professionnel perçoit sa place dans un système en constante évolution.",
  ]);

  ctx.addSubTitle("Comprendre pour se libérer");
  ctx.addParagraphs([
    "La compréhension est souvent la première forme de liberté.",
    "Lorsque l'on comprend les mécanismes qui structurent un environnement, on cesse de les subir passivement.",
    "On commence à voir les possibilités, les marges de manœuvre et les choix qui s'offrent à nous.",
    "Ce livre n'a pas pour objectif de désigner un responsable ni de proposer une opposition simpliste. Il a pour objectif d'éclairer.",
    "D'éclairer les dynamiques invisibles. D'éclairer les mécanismes économiques. D'éclairer la place réelle du professionnel dans l'écosystème.",
  ]);

  ctx.addDecorativeElement();

  ctx.addSubTitle("Reprendre conscience de sa valeur");
  ctx.addParagraphs([
    "Dans un environnement fortement structuré par la technologie, il est parfois facile d'oublier que la valeur d'un service repose avant tout sur l'humain qui le réalise.",
    "Un trajet n'est pas seulement un déplacement. C'est une expérience. C'est un service. C'est une relation de confiance.",
    "Cette valeur ne peut pas être automatisée. Elle existe grâce à l'engagement, au professionnalisme et à la présence du chauffeur.",
  ]);

  ctx.addSubTitle("Le pouvoir du choix");
  ctx.addParagraphs([
    "La véritable liberté ne réside pas dans l'absence de contraintes, mais dans la capacité à choisir la manière dont on souhaite organiser son activité.",
    "Choisir ses canaux. Choisir sa stratégie. Choisir sa direction.",
    "Cette capacité de choix est au cœur de toute démarche professionnelle consciente.",
  ]);

  ctx.addSubTitle("Le futur appartient aux professionnels conscients");
  ctx.addParagraphs([
    "Dans un monde en constante évolution, ceux qui comprennent les dynamiques du marché et qui adoptent une posture stratégique sont ceux qui construisent les modèles les plus solides.",
    "Le futur du métier appartient à ceux qui choisissent d'en comprendre les mécanismes plutôt que de les subir.",
  ]);

  ctx.addSubTitle("Une vision plus équilibrée");
  ctx.addParagraphs([
    "L'objectif n'est pas d'opposer, mais de rééquilibrer.",
  ]);
  ctx.addBulletList([
    "Rééquilibrer la perception du pouvoir.",
    "Rééquilibrer la compréhension de la valeur.",
    "Rééquilibrer la manière de voir son activité.",
  ]);
  ctx.addParagraph("Cette vision plus équilibrée ouvre la porte à un modèle plus durable et plus satisfaisant.");

  ctx.addQuote("Comprendre son environnement est la première étape pour reprendre une part de contrôle sur son avenir professionnel.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 15 — PLAN D'ACTION ==========
export const addPartie15 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 15, "Plan d'action", "Transformer la prise de conscience en mouvement", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "Comprendre un système est une étape essentielle. Mais la véritable transformation commence lorsque cette compréhension se traduit par des actions concrètes, même simples.",
    "Ce plan d'action n'est pas une méthode rigide ni un programme universel. Il s'agit d'une série de repères destinés à accompagner une évolution progressive vers un modèle plus équilibré et plus conscient.",
  ]);

  ctx.addSubTitle("Étape 1 — Observer avec lucidité");
  ctx.addParagraph("La première étape consiste simplement à observer son activité telle qu'elle est, sans jugement et sans précipitation. Prendre le temps d'analyser son fonctionnement, ses habitudes, ses résultats et ses ressentis.");

  ctx.addSubTitle("Étape 2 — Distinguer ce qui dépend de soi");
  ctx.addParagraph("Dans tout système, certains éléments sont sous notre contrôle et d'autres ne le sont pas. Identifier cette différence est essentiel pour se concentrer sur ce qui peut réellement évoluer.");

  ctx.addSeparator();

  ctx.addSubTitle("Étape 3 — Renforcer la relation client");
  ctx.addParagraph("Dans un métier de service, la relation est un levier majeur. Prendre le temps de soigner l'expérience client, d'être attentif aux détails et de maintenir un niveau de qualité constant permet de construire progressivement une réputation solide.");

  ctx.addSubTitle("Étape 4 — Commencer à structurer son activité");
  ctx.addParagraphs([
    "Structurer son activité ne signifie pas tout transformer du jour au lendemain. Cela peut commencer par des actions simples :",
  ]);
  ctx.addBulletList([
    "mieux organiser son temps",
    "clarifier ses objectifs",
    "identifier ses priorités",
  ]);
  ctx.addParagraph("Cette structuration progressive permet de passer d'une logique réactive à une logique plus proactive.");

  ctx.addSubTitle("Étape 5 — Diversifier progressivement");
  ctx.addParagraph("La diversification est un processus qui se construit dans le temps. Il ne s'agit pas de remplacer un système par un autre, mais d'ajouter progressivement de nouvelles sources d'activité.");

  ctx.addDecorativeElement();

  ctx.addSubTitle("Étape 6 — Développer une vision à long terme");
  ctx.addParagraph("Prendre le temps de réfléchir à la direction que l'on souhaite donner à son activité permet de prendre des décisions plus cohérentes. Cette vision n'a pas besoin d'être parfaite. Elle doit simplement donner un cap.");

  ctx.addSubTitle("Étape 7 — Cultiver une posture stratégique");
  ctx.addParagraph("Adopter une posture stratégique consiste à rester attentif aux évolutions du marché, à analyser les tendances et à ajuster progressivement son positionnement.");

  ctx.addSubTitle("Étape 8 — Accepter la progression");
  ctx.addParagraphs([
    "La transformation ne se fait jamais du jour au lendemain. Elle se construit à travers des étapes successives, chacune apportant un nouvel éclairage et une nouvelle opportunité.",
    "Accepter cette progression permet d'éviter la frustration de l'immédiateté et de construire un modèle solide et durable.",
  ]);

  ctx.addQuote("Chaque pas compte. Et le simple fait de lire ce livre est déjà un premier pas vers une posture plus consciente et plus stratégique.");

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== PARTIE 16 ==========
export const addPartie16 = (doc: jsPDF, startPage: number): number => {
  addChapterPage(doc, 16, "Au-delà de la compréhension", "Vers l'action", startPage, logoDataUrl);
  doc.addPage();
  const ctx = new DocContext(doc, startPage + 1);

  ctx.addParagraphs([
    "À ce stade du livre, une question se pose naturellement : et maintenant ?",
    "Comprendre les mécanismes du système est une étape fondamentale. Mais la compréhension seule ne transforme pas une situation.",
    "La véritable évolution commence lorsque l'on passe de l'analyse à l'action.",
    "Pas une action spectaculaire ou radicale. Mais une action réfléchie, progressive et alignée avec sa vision personnelle du métier.",
    "Agir, c'est avant tout choisir.",
    "Choisir de ne plus considérer sa situation comme figée. Choisir de regarder les possibilités qui existent. Choisir de construire, même modestement, une alternative.",
    "Agir, c'est aussi accepter que la transformation prend du temps.",
    "On ne construit pas une clientèle en un jour. On ne change pas un modèle du jour au lendemain. Mais chaque jour où l'on avance, même d'un petit pas, est un jour de construction.",
  ]);

  ctx.addSeparator();

  ctx.addSubTitle("La technologie comme alliée");
  ctx.addParagraphs([
    "La technologie n'est pas le problème. La manière dont elle est utilisée peut l'être.",
    "Lorsqu'elle est pensée pour servir le professionnel plutôt que pour le contraindre, elle devient un levier puissant.",
    "Des outils existent aujourd'hui pour permettre à chaque chauffeur de structurer son activité, de gérer sa clientèle et de développer sa visibilité.",
    "Ces outils ne remplacent pas le travail. Ils l'accompagnent.",
  ]);

  ctx.addDecorativeElement();

  ctx.addSubTitle("SoloCab : une vision au service des professionnels");
  ctx.addParagraphs([
    "Dans cette dynamique, certaines initiatives incarnent concrètement cette évolution vers un modèle plus équilibré.",
    "SoloCab fait partie de ces approches. Non pas comme une réponse unique ou une solution imposée, mais comme une expression concrète d'une vision : celle d'une technologie pensée pour accompagner les professionnels plutôt que pour les contraindre.",
    "Son ambition est simple : offrir des outils qui permettent de structurer son activité, de renforcer sa relation client et de développer progressivement son autonomie, tout en conservant la simplicité d'usage des technologies modernes.",
  ]);

  ctx.addSubTitle("L'essentiel reste entre les mains du professionnel");
  ctx.addParagraphs([
    "Au-delà des outils, la véritable transformation repose toujours sur la vision et les choix du professionnel.",
    "Les technologies peuvent accompagner. Les méthodes peuvent structurer. Les solutions peuvent faciliter.",
    "Mais c'est toujours l'individu qui décide de la direction qu'il souhaite prendre.",
  ]);

  ctx.fillRemainingSpace();
  ctx.finishPage();
  return ctx.pageNum;
};

// ========== MESSAGE DE L'AUTEUR + MANIFESTE + INSCRIPTION + BACK COVER ==========
export const addClosingPages = (doc: jsPDF, startPage: number): number => {
  doc.addPage();
  const ctx = new DocContext(doc, startPage);
  const { w, margin } = getPageDims(doc);

  // Decorative separator at top
  ctx.addDecorativeElement();

  // Message de l'auteur title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...c.deepBlue);
  doc.text("MESSAGE DE L'AUTEUR", w / 2, ctx.y, { align: "center" });
  ctx.y += 12;

  ctx.addSubTitle("Une réflexion née du terrain");
  ctx.addParagraphs([
    "Ce livre n'est pas né d'une théorie abstraite ni d'une simple analyse extérieure.",
    "Il est né d'observations, d'échanges, de discussions avec des professionnels qui vivent ce métier chaque jour, sur le terrain, au contact direct de la réalité.",
    "Des femmes et des hommes engagés, passionnés, qui travaillent avec sérieux et qui ressentent, parfois sans pouvoir l'exprimer clairement, que quelque chose évolue dans leur manière de vivre leur activité.",
    "Ce livre est né de cette réalité. D'un besoin de comprendre. D'un besoin de mettre des mots sur des ressentis. D'un besoin de prendre du recul sur un secteur en pleine transformation.",
  ]);

  ctx.addSubTitle("Une volonté d'apporter de la clarté");
  ctx.addParagraphs([
    "L'objectif n'a jamais été de critiquer ni d'opposer. Mais simplement d'apporter un éclairage.",
    "Un éclairage sur les mécanismes économiques. Un éclairage sur les dynamiques du marché. Un éclairage sur les possibilités qui existent aujourd'hui.",
    "Parce que la compréhension est toujours la première étape vers la liberté.",
  ]);

  ctx.addSeparator();

  // Manifeste
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...c.softViolet);
  ctx.checkPageBreak(20);
  doc.text("MANIFESTE SOLOCAB", w / 2, ctx.y, { align: "center" });
  ctx.y += 10;

  ctx.addSubTitle("Le mouvement des professionnels conscients");
  ctx.addParagraphs([
    "Nous croyons en un métier qui évolue. Un métier dans lequel les professionnels ne se contentent plus d'exécuter, mais choisissent de comprendre, de construire et de structurer leur activité.",
    "Nous croyons que la technologie doit servir ceux qui créent la valeur, et non l'inverse.",
    "Nous croyons que chaque professionnel possède le potentiel de développer une activité plus équilibrée, plus stable et plus consciente.",
    "Nous croyons qu'il est possible d'utiliser les outils modernes tout en conservant sa liberté de choix.",
    "Nous croyons que l'avenir du métier appartient à ceux qui comprennent les mécanismes plutôt qu'à ceux qui les subissent.",
    "Nous croyons en un modèle basé sur le respect, la transparence et l'autonomie.",
    "Et surtout, nous croyons que la véritable transformation commence toujours par une prise de conscience.",
  ]);

  ctx.addQuote("Comprendre pour choisir. Choisir pour construire.");

  ctx.addParagraphs([
    "Si vous avez lu jusqu'ici, alors quelque chose a probablement résonné en vous.",
    "Peut-être une question. Peut-être une prise de recul. Peut-être une confirmation.",
    "Quelle que soit votre impression, elle est légitime.",
    "Ce livre n'avait pas pour objectif de convaincre, mais d'ouvrir une réflexion.",
    "Et si cette réflexion vous accompagne dans votre manière de voir votre activité, alors il aura rempli son rôle.",
  ]);

  ctx.addQuote("La valeur sera toujours créée par ceux qui exercent avec professionnalisme et engagement. Et c'est peut-être là l'essentiel.");

  ctx.fillRemainingSpace();
  ctx.finishPage();

  // ========== PAGE INSCRIPTION ==========
  doc.addPage();
  const h = doc.internal.pageSize.getHeight();
  const inscPage = ctx.pageNum + 1;

  // Light background
  doc.setFillColor(...c.lightBg);
  doc.rect(0, 0, w, h, "F");

  // Subtle abstract circle decoration
  doc.setFillColor(230, 235, 248);
  doc.circle(w + 10, 40, 50, "F");
  doc.circle(-15, h - 50, 40, "F");

  // Logo
  addLogo(doc, w / 2 - 16, 28, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...c.primaryBlue);
  doc.text("REJOIGNEZ SOLOCAB", w / 2, 78, { align: "center" });

  // Decorative line
  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 35, 84, w / 2 + 35, 84);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12.5);
  doc.setTextColor(...c.darkText);
  const inscTexts = doc.splitTextToSize(
    "Vous souhaitez reprendre le contrôle de votre activité ? Construire votre propre clientèle ? Développer une activité durable et indépendante ?",
    w - 60
  );
  doc.text(inscTexts, w / 2, 98, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...c.darkText);
  doc.text("Inscrivez-vous gratuitement sur :", w / 2, 128, { align: "center" });

  // CTA box — premium blue — CLICKABLE
  const ctaX = w / 2 - 70;
  const ctaY = 136;
  const ctaW = 140;
  const ctaH = 20;
  const registrationUrl = "https://solo-cab-to-lovable.lovable.app/register-driver-promo";
  doc.setFillColor(...c.primaryBlue);
  doc.roundedRect(ctaX, ctaY, ctaW, ctaH, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  // Use textWithLink for universal PDF reader support
  const ctaLabel = "solocab.fr/chauffeur";
  const ctaTextW = doc.getTextWidth(ctaLabel);
  doc.textWithLink(ctaLabel, w / 2 - ctaTextW / 2, 149, { url: registrationUrl });
  // Fallback invisible link covering the whole button area
  doc.link(ctaX, ctaY, ctaW, ctaH, { url: registrationUrl });

  // 14-day free trial badge
  doc.setFillColor(34, 197, 94); // green
  doc.roundedRect(w / 2 - 55, 158, 110, 14, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("14 JOURS D'ESSAI GRATUIT", w / 2, 168, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...c.grayText);
  doc.text("Ou scannez le QR code de votre chauffeur partenaire", w / 2, 182, { align: "center" });

  // Features list
  const features = [
    "Gerez vos clients et vos courses en toute autonomie",
    "Fixez vos propres tarifs",
    "Fidelisez votre clientele avec vos outils",
    "Developpez votre chiffre d'affaires en direct",
  ];
  let fy = 198;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...c.primaryBlue);
  features.forEach((f) => {
    // Draw a small filled circle as bullet
    doc.setFillColor(...c.primaryBlue);
    doc.circle(w / 2 - 75, fy - 1.2, 1.5, "F");
    doc.text(f, w / 2 - 70, fy);
    fy += 11;
  });

  // Separator
  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1);
  doc.line(55, fy + 6, w - 55, fy + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...c.grayText);
  doc.text("Plateforme 100% dédiée aux chauffeurs VTC indépendants", w / 2, fy + 18, { align: "center" });
  doc.text("Sans frais de transaction sur vos courses directes", w / 2, fy + 26, { align: "center" });

  // Add a second clickable text link below for redundancy — use textWithLink
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...c.primaryBlue);
  const linkLabel = ">> Cliquez ici pour vous inscrire <<";
  const linkW = doc.getTextWidth(linkLabel);
  doc.textWithLink(linkLabel, w / 2 - linkW / 2, fy + 42, { url: "https://solo-cab-to-lovable.lovable.app/register-driver-promo" });

  addFooter(doc, inscPage);

  // ========== BACK COVER ==========
  doc.addPage();

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, w, h, "F");

  // Abstract shapes
  doc.setFillColor(30, 52, 110);
  doc.circle(w + 25, h / 4, 65, "F");
  doc.circle(-25, h * 0.75, 85, "F");
  doc.setFillColor(35, 58, 120);
  doc.circle(w * 0.2, h * 0.15, 20, "F");

  // Top decorative line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(45, h / 2 - 75, w - 45, h / 2 - 75);

  // Logo on back cover
  addLogo(doc, w / 2 - 20, h / 2 - 70, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("SOLOCAB ACADEMY", w / 2, h / 2 - 12, { align: "center" });

  doc.setFontSize(15);
  doc.setTextColor(...c.lightViolet);
  doc.text("Comprendre pour choisir.", w / 2, h / 2 + 8, { align: "center" });
  doc.text("Choisir pour construire.", w / 2, h / 2 + 22, { align: "center" });

  // Bottom decorative line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(2);
  doc.line(55, h / 2 + 38, w - 55, h / 2 + 38);

  // Decorative dots
  doc.setFillColor(45, 65, 125);
  for (let i = 0; i < 5; i++) {
    doc.circle(w / 2 - 20 + i * 10, h / 2 + 50, 1, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("www.solocab.fr", w / 2, h / 2 + 65, { align: "center" });
  doc.text("contact@solocab.fr", w / 2, h / 2 + 78, { align: "center" });

  // Link cliquable
  doc.link(w / 2 - 35, h / 2 + 57, 70, 14, { url: "https://www.solocab.fr" });

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 230);
  doc.text("SoloCab SASU", w / 2, h - 28, { align: "center" });

  return inscPage + 1;
};
