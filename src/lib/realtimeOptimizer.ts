/**
 * REALTIME OPTIMIZER - Gestion centralisée des subscriptions
 * Évite les fuites mémoire et optimise les performances
 */

import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ChannelConfig {
  name: string;
  table: string;
  filter?: string;
  events: Array<"INSERT" | "UPDATE" | "DELETE" | "*">;
  callback: (payload: any) => void;
  debounceMs?: number;
}

class RealtimeOptimizer {
  private channels: Map<string, RealtimeChannel> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_CHANNELS = 5; // Limite stricte

  /**
   * Créer ou récupérer un canal existant
   */
  subscribe(config: ChannelConfig): () => void {
    // Vérifier la limite de canaux
    if (this.channels.size >= this.MAX_CHANNELS && !this.channels.has(config.name)) {
      console.warn(`⚠️ Limite de ${this.MAX_CHANNELS} canaux atteinte. Utiliser unsubscribe d'abord.`);
      return () => {};
    }

    // Si le canal existe déjà, le réutiliser
    if (this.channels.has(config.name)) {
      console.log(`♻️ Réutilisation du canal existant: ${config.name}`);
      return () => this.unsubscribe(config.name);
    }

    console.log(`📡 Création nouveau canal: ${config.name}`);

    // Créer le canal
    const channel = supabase.channel(config.name);

    // Ajouter les listeners pour chaque événement
    config.events.forEach(event => {
      const changeConfig: any = {
        event,
        schema: "public",
        table: config.table,
      };

      if (config.filter) {
        changeConfig.filter = config.filter;
      }

      channel.on("postgres_changes", changeConfig, (payload) => {
        // Appliquer le debounce si configuré
        if (config.debounceMs) {
          this.debounceCallback(config.name, config.callback, payload, config.debounceMs);
        } else {
          config.callback(payload);
        }
      });
    });

    // S'abonner
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`✅ Canal subscribed: ${config.name}`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`❌ Erreur canal: ${config.name}`);
      }
    });

    this.channels.set(config.name, channel);

    // Retourner la fonction de nettoyage
    return () => this.unsubscribe(config.name);
  }

  /**
   * Se désabonner d'un canal
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`🔌 Désinscription canal: ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      
      // Nettoyer le timer debounce
      const timer = this.debounceTimers.get(channelName);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(channelName);
      }
    }
  }

  /**
   * Se désabonner de tous les canaux
   */
  unsubscribeAll(): void {
    console.log(`🔌 Désinscription de tous les canaux (${this.channels.size})`);
    this.channels.forEach((_, name) => this.unsubscribe(name));
  }

  /**
   * Debounce pour les callbacks
   */
  private debounceCallback(
    key: string,
    callback: (payload: any) => void,
    payload: any,
    delay: number
  ): void {
    // Annuler le timer précédent
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Créer un nouveau timer
    const timer = setTimeout(() => {
      callback(payload);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Obtenir le nombre de canaux actifs
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }

  /**
   * Obtenir les noms des canaux actifs
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

// Instance singleton
export const realtimeOptimizer = new RealtimeOptimizer();

// Nettoyage au déchargement de la page
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    realtimeOptimizer.unsubscribeAll();
  });
}
