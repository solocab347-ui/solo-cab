import jsPDF from "jspdf";
import { ebookColors } from "./solocabEbookColors";
import { guideChapters, guideMetadata } from "./guideIndependantContent";
import { guideTools, ACADEMY_HUB_URL } from "./guideIndependantConfig";

// Images
import guideCoverImg from "@/assets/guide-cover-vtc.jpg";
import ch1Img from "@/assets/guide-ch1-conscience.jpg";
import ch2Img from "@/assets/guide-ch2-mindset.jpg";
import ch3Img from "@/assets/guide-ch3-image.jpg";
import ch4Img from "@/assets/guide-ch4-prospection.jpg";
import ch5Img from "@/assets/guide-ch5-fidelisation.jpg";
import ch8Img from "@/assets/guide-ch8-roadmap.jpg";

const c = ebookColors;

// Map chapter images
const chapterImages: Record<number, string> = {
  1: ch1Img,
  2: ch2Img,
  3: ch3Img,
  4: ch4Img,
  5: ch5Img,
  8: ch8Img,
};

// jsPDF helvetica limitations — sanitize all text
function san(text: string): string {
  return text
    .replace(/€/g, "EUR")
    .replace(/«\s*/g, '"')
    .replace(/\s*»/g, '"')
    .replace(/—/g, " - ")
    .replace(/…/g, "...")
    .replace(/'/g, "'")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ""); // strip emojis
}

// ===== LOAD IMAGES =====
async function loadImageEl(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  img.crossOrigin = "anonymous";
  await new Promise<void>((r) => {
    img.onload = () => r();
    img.onerror = () => r();
  });
  return img;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch("/images/solocab-academy-logo.png");
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ===== PAGE CONTEXT (auto-pagination) =====
class PageCtx {
  doc: jsPDF;
  y: number;
  page: number;
  pw: number;
  ph: number;
  ml = 28;
  mr = 28;
  mt = 32;
  mb = 22;
  cw: number;
  maxY: number;
  logoUrl: string | null;

  constructor(doc: jsPDF, page: number, logoUrl: string | null) {
    this.doc = doc;
    this.page = page;
    this.pw = doc.internal.pageSize.getWidth();
    this.ph = doc.internal.pageSize.getHeight();
    this.cw = this.pw - this.ml - this.mr;
    this.maxY = this.ph - this.mb;
    this.y = this.mt;
    this.logoUrl = logoUrl;
  }

  check(need: number) {
    if (this.y + need > this.maxY) {
      this.footer();
      this.doc.addPage();
      this.page++;
      this.y = this.mt;
    }
  }

  footer() {
    const d = this.doc;
    d.setDrawColor(...c.softBlue);
    d.setLineWidth(0.3);
    d.line(this.ml, this.ph - 16, this.pw - this.mr, this.ph - 16);
    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    d.setTextColor(...c.grayText);
    d.text(san("Le Guide du Chauffeur Independant - SoloCab Academy"), this.ml, this.ph - 9);
    d.text(`${this.page}`, this.pw - this.mr, this.ph - 9, { align: "right" });
  }

  newPage() {
    this.footer();
    this.doc.addPage();
    this.page++;
    this.y = this.mt;
  }

  // --- Text helpers ---
  title(text: string) {
    this.check(18);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(17);
    this.doc.setTextColor(...c.deepBlue);
    this.doc.text(san(text), this.ml, this.y);
    this.doc.setDrawColor(...c.softViolet);
    this.doc.setLineWidth(1);
    this.doc.line(this.ml, this.y + 3, this.ml + Math.min(this.doc.getTextWidth(san(text)), this.cw), this.y + 3);
    this.y += 14;
  }

  para(text: string, fontSize = 12, indent = 0) {
    const d = this.doc;
    d.setFont("helvetica", "normal");
    d.setFontSize(fontSize);
    d.setTextColor(...c.bodyText);
    const lines: string[] = d.splitTextToSize(san(text), this.cw - indent);
    const lh = fontSize * 0.52;
    for (const line of lines) {
      this.check(lh + 1);
      d.text(line, this.ml + indent, this.y);
      this.y += lh;
    }
    this.y += 3.5;
  }

  paras(texts: string[], fontSize = 12) {
    for (const t of texts) this.para(t, fontSize);
  }

  bullets(items: string[], fontSize = 11) {
    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(san(item), this.cw - 14);
      const lh = fontSize * 0.5;
      this.check(lines.length * lh + 5);
      this.doc.setFillColor(...c.lightBlue);
      this.doc.circle(this.ml + 3.5, this.y - 1.3, 1.4, "F");
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(...c.bodyText);
      this.doc.text(lines, this.ml + 10, this.y);
      this.y += lines.length * lh + 3.5;
    }
    this.y += 2;
  }

  quote(text: string) {
    const d = this.doc;
    d.setFont("helvetica", "bolditalic");
    d.setFontSize(12);
    const lines: string[] = d.splitTextToSize(san(text), this.cw - 24);
    const bh = 12 + lines.length * 6;
    this.check(bh + 8);
    d.setFillColor(...c.lightGold);
    d.roundedRect(this.ml, this.y, this.cw, bh, 4, 4, "F");
    d.setFillColor(...c.softViolet);
    d.roundedRect(this.ml, this.y, 4, bh, 2, 2, "F");
    d.setTextColor(...c.deepBlue);
    d.text(lines, this.ml + 14, this.y + 8);
    this.y += bh + 8;
  }

  infoCard(cardTitle: string, text: string, bg = c.lightBg, accent = c.primaryBlue) {
    const d = this.doc;
    d.setFont("helvetica", "normal");
    d.setFontSize(10.5);
    const lines: string[] = d.splitTextToSize(san(text), this.cw - 22);
    const bh = 14 + lines.length * 5;
    this.check(bh + 6);
    d.setFillColor(...bg);
    d.roundedRect(this.ml, this.y, this.cw, bh, 3, 3, "F");
    d.setFillColor(...accent);
    d.roundedRect(this.ml, this.y, 3.5, bh, 1.5, 1.5, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.setTextColor(...accent);
    d.text(san(cardTitle), this.ml + 11, this.y + 8);
    d.setFont("helvetica", "normal");
    d.setFontSize(10.5);
    d.setTextColor(...c.bodyText);
    d.text(lines, this.ml + 11, this.y + 15);
    this.y += bh + 6;
  }

  separator() {
    this.check(14);
    const cx = this.pw / 2;
    this.y += 3;
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(cx - 10, this.y + 3, 1.2, "F");
    this.doc.setFillColor(...c.softViolet);
    this.doc.circle(cx, this.y + 3, 1.5, "F");
    this.doc.setFillColor(...c.softBlue);
    this.doc.circle(cx + 10, this.y + 3, 1.2, "F");
    this.y += 12;
  }

  statBoxes(stats: { value: string; label: string }[]) {
    const boxW = (this.cw - (stats.length - 1) * 5) / stats.length;
    this.check(32);
    stats.forEach((s, i) => {
      const x = this.ml + i * (boxW + 5);
      this.doc.setFillColor(...c.lightBg);
      this.doc.roundedRect(x, this.y, boxW, 26, 4, 4, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(16);
      this.doc.setTextColor(...c.primaryBlue);
      this.doc.text(san(s.value), x + boxW / 2, this.y + 12, { align: "center" });
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...c.grayText);
      this.doc.text(san(s.label), x + boxW / 2, this.y + 20, { align: "center" });
    });
    this.y += 32;
  }

  addLogo(x: number, y: number, size = 22) {
    if (this.logoUrl) {
      try {
        this.doc.addImage(this.logoUrl, "PNG", x, y, size, size);
      } catch { /* silent */ }
    }
  }
}

// ===== MAIN GENERATOR =====
export async function generateGuideIndependantPdf() {
  // Load assets
  const [coverImg, logoUrl, ...chImgs] = await Promise.all([
    loadImageEl(guideCoverImg),
    loadLogoDataUrl(),
    ...Object.values(chapterImages).map(loadImageEl),
  ]);

  const chapterImgMap: Record<number, HTMLImageElement> = {};
  const keys = Object.keys(chapterImages).map(Number);
  keys.forEach((k, i) => { chapterImgMap[k] = chImgs[i]; });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ctx = new PageCtx(doc, 1, logoUrl);

  // =================== COVER ===================
  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, pw, ph, "F");

  // Decorative circles
  doc.setFillColor(25, 45, 88);
  doc.circle(-20, ph * 0.3, 60, "F");
  doc.circle(pw + 15, ph * 0.7, 45, "F");

  // Cover image
  try {
    const imgW = 110;
    const imgH = imgW * (coverImg.height / coverImg.width);
    const imgX = (pw - imgW) / 2;
    doc.addImage(coverImg, "JPEG", imgX, 18, imgW, Math.min(imgH, 130));
    // Overlay
    doc.setFillColor(...c.darkBlue);
    doc.setGState(new (doc as any).GState({ opacity: 0.45 }));
    doc.rect(imgX, 18, imgW, Math.min(imgH, 130), "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch { /* silent */ }

  // Logo
  ctx.addLogo(pw / 2 - 14, 155, 28);

  // Academy label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...c.lightViolet);
  doc.text("SOLOCAB ACADEMY", pw / 2, 190, { align: "center" });

  // Violet line
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(50, 196, pw - 50, 196);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(san("LE GUIDE DU CHAUFFEUR"), pw / 2, 212, { align: "center" });
  doc.text(san("INDEPENDANT"), pw / 2, 222, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...c.lightViolet);
  doc.text(san("Construire sa Clientele Privee de A a Z"), pw / 2, 236, { align: "center" });

  // Tagline
  doc.setFontSize(9.5);
  doc.setTextColor(180, 190, 220);
  const tagLines: string[] = doc.splitTextToSize(san(guideMetadata.tagline), 140);
  let ty = 250;
  for (const tl of tagLines) {
    doc.text(tl, pw / 2, ty, { align: "center" });
    ty += 5;
  }

  // Bottom
  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(50, ph - 40, pw - 50, ph - 40);
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 220);
  doc.text(san("Edition 2026 - SoloCab Academy"), pw / 2, ph - 30, { align: "center" });
  doc.text(san("4,99 EUR - Guide Premium"), pw / 2, ph - 22, { align: "center" });

  ctx.footer();

  // =================== TABLE OF CONTENTS ===================
  doc.addPage();
  ctx.page = 2;
  ctx.y = ctx.mt;

  ctx.addLogo(pw / 2 - 12, 18, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...c.deepBlue);
  doc.text("SOMMAIRE", pw / 2, 55, { align: "center" });

  doc.setDrawColor(...c.softViolet);
  doc.setLineWidth(1.5);
  doc.line(pw / 2 - 30, 60, pw / 2 + 30, 60);

  ctx.y = 74;
  for (const ch of guideChapters) {
    ctx.check(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...c.softViolet);
    doc.text("Partie " + ch.partNumber, ctx.ml + 2, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...c.bodyText);
    doc.text(san(ch.title), ctx.ml + 30, ctx.y);
    doc.setDrawColor(...c.softBlue);
    doc.setLineWidth(0.2);
    const te = ctx.ml + 30 + doc.getTextWidth(san(ch.title)) + 4;
    doc.line(te, ctx.y - 0.5, pw - ctx.mr, ctx.y - 0.5);
    ctx.y += 12;
  }

  // Tools section in TOC
  ctx.y += 6;
  ctx.check(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...c.softViolet);
  doc.text(san("BOITE A OUTILS (18 fiches pratiques)"), ctx.ml + 2, ctx.y);
  ctx.y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...c.bodyText);

  const categories = [...new Set(guideTools.map(t => t.category))];
  for (const cat of categories) {
    ctx.check(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...c.grayText);
    doc.text(san(cat), ctx.ml + 8, ctx.y);
    ctx.y += 6;
    const tools = guideTools.filter(t => t.category === cat);
    for (const tool of tools) {
      ctx.check(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...c.bodyText);
      doc.text(san("- " + tool.title), ctx.ml + 14, ctx.y);
      ctx.y += 5.5;
    }
    ctx.y += 2;
  }

  ctx.footer();

  // =================== CHAPTERS ===================
  for (const chapter of guideChapters) {
    // --- CHAPTER TRANSITION PAGE ---
    doc.addPage();
    ctx.page++;

    doc.setFillColor(...c.darkBlue);
    doc.rect(0, 0, pw, ph, "F");

    // Decorative circles
    doc.setFillColor(25, 45, 88);
    doc.circle(-25, ph * 0.25, 65, "F");
    doc.circle(pw + 20, ph * 0.65, 50, "F");
    doc.setFillColor(35, 58, 110);
    doc.circle(pw * 0.8, ph * 0.2, 20, "F");

    // Chapter image (if available)
    const chImg = chapterImgMap[chapter.partNumber];
    if (chImg && chImg.complete && chImg.naturalWidth > 0) {
      try {
        const iw = 80;
        const ih = iw * (chImg.naturalHeight / chImg.naturalWidth);
        const ix = (pw - iw) / 2;
        const iy = 30;
        doc.addImage(chImg, "JPEG", ix, iy, iw, Math.min(ih, 100));
        doc.setFillColor(...c.darkBlue);
        doc.setGState(new (doc as any).GState({ opacity: 0.5 }));
        doc.rect(ix, iy, iw, Math.min(ih, 100), "F");
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      } catch { /* silent */ }
    }

    // Logo
    ctx.addLogo(pw / 2 - 14, ph / 2 - 85, 28);

    // Top line
    doc.setDrawColor(...c.lightViolet);
    doc.setLineWidth(1.5);
    doc.line(ctx.ml + 15, ph / 2 - 50, pw - ctx.mr - 15, ph / 2 - 50);

    // Chapter number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(...c.lightViolet);
    doc.text(`${chapter.partNumber}`, pw / 2, ph / 2 - 15, { align: "center" });

    // Title
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const titleLines: string[] = doc.splitTextToSize(san(chapter.title.toUpperCase()), pw - ctx.ml * 2 - 20);
    doc.text(titleLines, pw / 2, ph / 2 + 15, { align: "center" });

    // Subtitle
    if (chapter.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...c.lightViolet);
      const subLines: string[] = doc.splitTextToSize(san(chapter.subtitle), pw - ctx.ml * 2 - 20);
      doc.text(subLines, pw / 2, ph / 2 + 37, { align: "center" });
    }

    // Bottom line
    doc.setDrawColor(...c.lightViolet);
    doc.setLineWidth(1.5);
    doc.line(ctx.ml + 15, ph / 2 + 53, pw - ctx.mr - 15, ph / 2 + 53);

    // Dots
    const dotsY = ph - 45;
    doc.setFillColor(40, 60, 115);
    for (let i = 0; i < 5; i++) {
      doc.circle(pw / 2 - 20 + i * 10, dotsY, 1, "F");
    }

    ctx.footer();

    // --- CHAPTER CONTENT ---
    doc.addPage();
    ctx.page++;
    ctx.y = ctx.mt;

    // Introduction (italic)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11.5);
    doc.setTextColor(...c.grayText);
    const introLines: string[] = doc.splitTextToSize(san(chapter.introduction), ctx.cw);
    for (const il of introLines) {
      ctx.check(5.5);
      doc.text(il, ctx.ml, ctx.y);
      ctx.y += 5.5;
    }
    ctx.y += 8;

    ctx.separator();

    // Sections
    for (const section of chapter.sections) {
      ctx.title(section.heading);

      ctx.paras(section.paragraphs);

      if (section.bulletPoints) {
        ctx.bullets(section.bulletPoints);
      }

      // Highlight
      if (section.highlight) {
        ctx.quote(section.highlight);
      }

      // Example
      if (section.example) {
        ctx.infoCard("Exemple concret", section.example, c.lightBg, c.primaryBlue);
      }

      ctx.y += 4;
    }

    // Stats page after certain chapters
    if (chapter.partNumber === 1) {
      ctx.separator();
      ctx.statBoxes([
        { value: "5-7 EUR", label: "Taux horaire reel plateforme" },
        { value: "15-25 EUR", label: "Taux horaire client prive" },
        { value: "x3", label: "Multiplicateur de revenus" },
      ]);
    }
    if (chapter.partNumber === 2) {
      ctx.separator();
      ctx.statBoxes([
        { value: "30 min", label: "Prospection quotidienne" },
        { value: "180h", label: "Par an investies" },
        { value: "22 jours", label: "Equivalent temps plein" },
      ]);
    }
    if (chapter.partNumber === 4) {
      ctx.separator();
      ctx.statBoxes([
        { value: "85%", label: "Hotels cherchent des independants" },
        { value: "3-5", label: "RDV/semaine recommandes" },
        { value: "90 jours", label: "Pour premiers resultats" },
      ]);
    }
    if (chapter.partNumber === 6) {
      ctx.separator();
      ctx.statBoxes([
        { value: "72%", label: "Clients via Google My Business" },
        { value: "45%", label: "Via bouche-a-oreille" },
        { value: "4.9/5", label: "Note moyenne visee" },
      ]);
    }

    // Action Box
    if (chapter.actionBox) {
      ctx.check(30);
      ctx.y += 4;
      const ab = chapter.actionBox;

      // Calculate height
      let abH = 16;
      for (const step of ab.steps) {
        const sl: string[] = doc.splitTextToSize(san(step), ctx.cw - 22);
        abH += sl.length * 5 + 3;
      }
      abH += 6;

      ctx.check(abH);
      doc.setFillColor(...c.lightGreen);
      doc.roundedRect(ctx.ml, ctx.y, ctx.cw, abH, 3, 3, "F");
      doc.setFillColor(...c.green);
      doc.roundedRect(ctx.ml, ctx.y, 3.5, abH, 1.5, 1.5, "F");

      ctx.y += 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...c.green);
      doc.text(san("PASSAGE A L'ACTION : " + ab.title), ctx.ml + 11, ctx.y);
      ctx.y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...c.bodyText);
      for (let i = 0; i < ab.steps.length; i++) {
        const stepText = san((i + 1) + ". " + ab.steps[i]);
        const stepLines: string[] = doc.splitTextToSize(stepText, ctx.cw - 22);
        for (const sl of stepLines) {
          doc.text(sl, ctx.ml + 11, ctx.y);
          ctx.y += 5;
        }
        ctx.y += 2.5;
      }
      ctx.y += 8;
    }

    // Tool Box
    if (chapter.toolBox) {
      ctx.check(20);
      const tb = chapter.toolBox;
      let tbH = 16;
      for (const tool of tb.tools) {
        tbH += 11;
      }
      tbH += 4;

      ctx.check(tbH);
      doc.setFillColor(...c.lightPurple);
      doc.roundedRect(ctx.ml, ctx.y, ctx.cw, tbH, 3, 3, "F");
      doc.setFillColor(...c.purple);
      doc.roundedRect(ctx.ml, ctx.y, 3.5, tbH, 1.5, 1.5, "F");

      ctx.y += 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...c.purple);
      doc.text(san("BOITE A OUTILS : " + tb.title), ctx.ml + 11, ctx.y);
      ctx.y += 8;

      doc.setFontSize(9.5);
      for (const tool of tb.tools) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(90, 70, 160);
        doc.text(san(tool.name + " (" + tool.type + ")"), ctx.ml + 11, ctx.y);
        ctx.y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...c.bodyText);
        doc.text(san(tool.description), ctx.ml + 11, ctx.y);
        ctx.y += 6.5;
      }
      ctx.y += 8;
    }

    ctx.footer();
  }

  // =================== TOOLS SECTION ===================
  // Tools intro page
  doc.addPage();
  ctx.page++;

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, pw, ph, "F");

  doc.setFillColor(25, 45, 88);
  doc.circle(-25, ph * 0.25, 65, "F");
  doc.circle(pw + 20, ph * 0.65, 50, "F");

  ctx.addLogo(pw / 2 - 14, ph / 2 - 85, 28);

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(ctx.ml + 15, ph / 2 - 50, pw - ctx.mr - 15, ph / 2 - 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...c.lightViolet);
  doc.text("18", pw / 2, ph / 2 - 10, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("BOITE A OUTILS", pw / 2, ph / 2 + 15, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...c.lightViolet);
  doc.text(san("Fiches pratiques telechargeables"), pw / 2, ph / 2 + 30, { align: "center" });
  doc.text(san("PDF - Word - Excel"), pw / 2, ph / 2 + 40, { align: "center" });

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(ctx.ml + 15, ph / 2 + 53, pw - ctx.mr - 15, ph / 2 + 53);

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 220);
  doc.text(san("Telechargez chaque outil sur : " + ACADEMY_HUB_URL), pw / 2, ph / 2 + 70, { align: "center" });

  ctx.footer();

  // --- RENDER EACH TOOL ---
  for (const tool of guideTools) {
    doc.addPage();
    ctx.page++;
    ctx.y = ctx.mt;

    // Tool header
    doc.setFillColor(...c.lightBg);
    doc.roundedRect(ctx.ml, ctx.y - 6, ctx.cw, 30, 4, 4, "F");
    doc.setFillColor(...c.primaryBlue);
    doc.roundedRect(ctx.ml, ctx.y - 6, 4, 30, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...c.softViolet);
    doc.text(san("OUTIL - " + tool.category), ctx.ml + 12, ctx.y);
    ctx.y += 6;

    doc.setFontSize(14);
    doc.setTextColor(...c.deepBlue);
    doc.text(san(tool.title), ctx.ml + 12, ctx.y);
    ctx.y += 5;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...c.grayText);
    doc.text(san(tool.subtitle), ctx.ml + 12, ctx.y);
    ctx.y += 12;

    // Description
    ctx.para(tool.description, 10.5);
    ctx.y += 2;

    // Format badges
    const badgeY = ctx.y;
    doc.setFontSize(7.5);
    let bx = ctx.ml;
    for (const fmt of tool.formats) {
      const label = fmt.toUpperCase();
      const bw = doc.getTextWidth(label) + 8;
      const bgColor = fmt === "excel" ? c.green : fmt === "word" ? c.primaryBlue : c.softViolet;
      doc.setFillColor(...bgColor);
      doc.roundedRect(bx, badgeY - 3, bw, 7, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(label, bx + 4, badgeY + 2);
      bx += bw + 4;
    }
    ctx.y += 10;

    // Download link
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...c.primaryBlue);
    const dlUrl = ACADEMY_HUB_URL + "/outils/" + tool.id;
    doc.textWithLink(san("Telecharger cet outil : " + dlUrl), ctx.ml, ctx.y, { url: dlUrl });
    ctx.y += 8;

    // Separator
    doc.setDrawColor(...c.softBlue);
    doc.setLineWidth(0.5);
    doc.line(ctx.ml, ctx.y, pw - ctx.mr, ctx.y);
    ctx.y += 8;

    // Tool content lines
    doc.setFontSize(10);
    for (const line of tool.contentLines) {
      ctx.check(6);
      if (line === "") {
        ctx.y += 3;
        continue;
      }
      // Headers are uppercase/bold
      const isHeader = line === line.toUpperCase() && line.length > 3 && !line.includes("___");
      if (isHeader) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...c.deepBlue);
        ctx.y += 2;
      } else if (line.includes("___")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...c.bodyText);
        // Draw underline for fill-in fields
        const textPart = san(line.split("___")[0]);
        doc.text(textPart, ctx.ml + 4, ctx.y);
        const tw = doc.getTextWidth(textPart);
        doc.setDrawColor(...c.softBlue);
        doc.setLineWidth(0.3);
        doc.line(ctx.ml + 4 + tw, ctx.y + 0.5, ctx.ml + 4 + tw + 50, ctx.y + 0.5);
      } else if (line.startsWith("[ ]") || line.startsWith("[")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...c.bodyText);
        // Checkbox style
        doc.setDrawColor(...c.softBlue);
        doc.setLineWidth(0.3);
        doc.rect(ctx.ml + 4, ctx.y - 3, 3.5, 3.5);
        doc.text(san(line.replace(/^\[ \] ?/, "")), ctx.ml + 10, ctx.y);
      } else if (line.startsWith("--> ") || line.startsWith("-->")) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(...c.green);
        const arrowLines: string[] = doc.splitTextToSize(san(line), ctx.cw - 12);
        for (const al of arrowLines) {
          ctx.check(5);
          doc.text(al, ctx.ml + 10, ctx.y);
          ctx.y += 5;
        }
        ctx.y -= 5; // compensate for the loop increment below
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...c.bodyText);
        const wLines: string[] = doc.splitTextToSize(san(line), ctx.cw - 8);
        for (const wl of wLines) {
          ctx.check(5);
          doc.text(wl, ctx.ml + 4, ctx.y);
          ctx.y += 5;
        }
        ctx.y -= 5;
      }
      ctx.y += 5.5;
    }

    ctx.footer();
  }

  // =================== CLOSING PAGE ===================
  doc.addPage();
  ctx.page++;

  doc.setFillColor(...c.darkBlue);
  doc.rect(0, 0, pw, ph, "F");

  doc.setFillColor(25, 45, 88);
  doc.circle(-25, ph * 0.25, 65, "F");

  ctx.addLogo(pw / 2 - 16, 50, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...c.lightViolet);
  doc.text("SOLOCAB ACADEMY", pw / 2, 92, { align: "center" });

  doc.setDrawColor(...c.lightViolet);
  doc.setLineWidth(1.5);
  doc.line(50, 98, pw - 50, 98);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(san("Votre chemin commence ici."), pw / 2, 118, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(200, 210, 230);
  const closingText = san("Ce guide vous a donne la carte. Les outils. La methode. Maintenant, c'est a vous de faire le premier pas. Chaque jour est une opportunite de construire quelque chose qui vous appartient.");
  const closingLines: string[] = doc.splitTextToSize(closingText, ctx.cw - 20);
  let cy = 135;
  for (const cl of closingLines) {
    doc.text(cl, pw / 2, cy, { align: "center" });
    cy += 7;
  }

  // CTA
  cy += 15;
  doc.setFillColor(...c.softViolet);
  doc.roundedRect(pw / 2 - 45, cy - 6, 90, 18, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("solocab.com", pw / 2, cy + 5, { align: "center" });
  doc.link(pw / 2 - 45, cy - 6, 90, 18, { url: "https://www.solocab.com" });

  cy += 25;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 190, 220);
  doc.text(san("14 jours d'essai gratuit - Sans engagement"), pw / 2, cy, { align: "center" });

  cy += 20;
  doc.setFontSize(9);
  doc.setTextColor(...c.grayText);
  doc.text(san("Tous vos outils sur : " + ACADEMY_HUB_URL), pw / 2, cy, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(80, 90, 120);
  doc.text(san("(c) 2026 SoloCab Academy - Tous droits reserves"), pw / 2, ph - 15, { align: "center" });

  ctx.footer();
  doc.save("Guide_Chauffeur_Independant_SoloCab.pdf");
}
