// Podcast scripts generated from the SoloCab eBook
// Title: "Être indépendant dans le secteur du VTC"

import { audiobookChapters } from "@/lib/audiobook/solocabAudiobookContent";

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  script: string;
}

const PODCAST_INTRO = `Bienvenue dans "Être indépendant dans le secteur du VTC", le podcast qui décrypte les réalités du métier de chauffeur VTC. Ce podcast est basé sur le livre créé par SoloCab, "L'Illusion des Applications", un ouvrage qui analyse en profondeur les dynamiques du secteur du transport de personnes. Installez-vous confortablement, et plongeons ensemble dans cette réflexion.`;

const PODCAST_OUTRO = `Merci d'avoir écouté cet épisode de "Être indépendant dans le secteur du VTC". Si ce contenu vous a intéressé, n'hésitez pas à découvrir l'intégralité du livre "L'Illusion des Applications" disponible sur SoloCab. Comprendre pour choisir. Choisir pour construire. À bientôt.`;

const TRANSITION = `\n\n`;

function buildChapterScript(chapterIdx: number): string {
  const chapter = audiobookChapters[chapterIdx];
  if (!chapter) return "";
  
  const headerLine = chapter.subtitle 
    ? `${chapter.title}. ${chapter.subtitle}.`
    : `${chapter.title}.`;
  
  return `${headerLine}${TRANSITION}${chapter.paragraphs.join("\n\n")}`;
}

// Full podcast: all chapters combined
export function getFullPodcastScript(): PodcastEpisode {
  const allChapters = audiobookChapters
    .map((_, idx) => buildChapterScript(idx))
    .join(`${TRANSITION}`);

  return {
    id: "full",
    title: "Être indépendant dans le secteur du VTC — Podcast Complet",
    description: "L'intégralité du livre \"L'Illusion des Applications\" de SoloCab en format podcast. Un voyage complet à travers les réalités du métier de chauffeur VTC.",
    script: `${PODCAST_INTRO}${TRANSITION}${allChapters}${TRANSITION}${PODCAST_OUTRO}`,
  };
}

// Individual episode per chapter (with intro/outro for standalone listening)
export function getChapterPodcastScript(chapterIdx: number): PodcastEpisode {
  const chapter = audiobookChapters[chapterIdx];
  if (!chapter) {
    return { id: "unknown", title: "Episode inconnu", description: "", script: "" };
  }

  const episodeNum = chapterIdx + 1;
  const chapterScript = buildChapterScript(chapterIdx);

  const episodeIntro = `Bienvenue dans "Être indépendant dans le secteur du VTC", épisode ${episodeNum} : ${chapter.title}${chapter.subtitle ? ", " + chapter.subtitle : ""}. Ce podcast est basé sur le livre "L'Illusion des Applications", créé par SoloCab. C'est parti.`;

  const episodeOutro = `C'était l'épisode ${episodeNum} de "Être indépendant dans le secteur du VTC", consacré à ${chapter.title}. Rendez-vous dans le prochain épisode pour continuer cette exploration. Merci de votre écoute.`;

  return {
    id: `chapter-${chapterIdx}`,
    title: `Épisode ${episodeNum} — ${chapter.title}`,
    description: chapter.subtitle || chapter.paragraphs[0]?.slice(0, 120) + "...",
    script: `${episodeIntro}${TRANSITION}${chapterScript}${TRANSITION}${episodeOutro}`,
  };
}

// Chapter script WITHOUT intro/outro (for full podcast assembly)
export function getChapterScriptOnly(chapterIdx: number): PodcastEpisode {
  const chapter = audiobookChapters[chapterIdx];
  if (!chapter) {
    return { id: "unknown", title: "Episode inconnu", description: "", script: "" };
  }

  return {
    id: `chapter-${chapterIdx}`,
    title: `Épisode ${chapterIdx + 1} — ${chapter.title}`,
    description: chapter.subtitle || chapter.paragraphs[0]?.slice(0, 120) + "...",
    script: buildChapterScript(chapterIdx),
  };
}

// For individual episode listing (with intro/outro)
export function getAllEpisodes(): PodcastEpisode[] {
  return audiobookChapters.map((_, idx) => getChapterPodcastScript(idx));
}

// For full podcast assembly (chapters only, no repeated intros/outros)
export function getAllChaptersOnly(): PodcastEpisode[] {
  return audiobookChapters.map((_, idx) => getChapterScriptOnly(idx));
}

export const TOTAL_CHAPTERS = audiobookChapters.length;
