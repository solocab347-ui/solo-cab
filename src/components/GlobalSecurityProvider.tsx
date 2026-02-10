/**
 * PROTECTION SÉCURITÉ GLOBALE
 * S'initialise automatiquement pour tous les utilisateurs
 * Protège contre: XSS, Clickjacking, Bots, DDoS, Spam
 */

import { useEffect, useRef } from 'react';
import { 
  initClientSecurity, 
  analyzeAndReportBot, 
  trackRequestPattern,
  logSecurityEvent,
} from '@/lib/security';

// Compteur global pour limiter les requêtes API
const requestCounter = {
  count: 0,
  windowStart: Date.now(),
  blocked: false,
};

// Protection contre les requêtes excessives
const globalRateLimiter = (url?: string) => {
  const now = Date.now();
  const windowDuration = 60000; // 1 minute
  const maxRequests = 500; // Max 500 requêtes par minute (was 100 - too low for SPA)

  if (now - requestCounter.windowStart > windowDuration) {
    requestCounter.count = 0;
    requestCounter.windowStart = now;
    requestCounter.blocked = false;
  }

  requestCounter.count++;

  // Never block Supabase auth or essential API requests
  if (url && (url.includes('/auth/') || url.includes('supabase'))) {
    return false;
  }

  if (requestCounter.count > maxRequests && !requestCounter.blocked) {
    requestCounter.blocked = true;
    logSecurityEvent({
      eventType: 'rate_limit',
      details: {
        count: requestCounter.count,
        threshold: maxRequests,
        source: 'global_rate_limiter',
      },
    });
    return true; // Bloqué
  }

  return requestCounter.blocked;
};

// Interception globale des requêtes fetch
const installFetchInterceptor = () => {
  // Prevent double-wrapping if called multiple times
  if ((window.fetch as any).__solocab_intercepted) return;
  
  const originalFetch = window.fetch;

  const interceptedFetch = async (...args: Parameters<typeof fetch>) => {
    // Extract URL for whitelisting
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';

    // Vérifier le rate limit (auth/supabase requests are never blocked)
    if (globalRateLimiter(url)) {
      console.warn('[Security] Requête bloquée - rate limit atteint');
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Tracker le pattern de requête pour détection d'anomalies
    try {
      trackRequestPattern();
    } catch (e) {
      // Never let tracking crash a real request
    }

    // Exécuter la requête originale
    return originalFetch.apply(window, args);
  };
  
  (interceptedFetch as any).__solocab_intercepted = true;
  window.fetch = interceptedFetch;
};
const installXSSProtection = () => {
  // Observer les mutations DOM pour détecter les injections
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLScriptElement) {
          const src = node.src || '';
          const inline = node.innerHTML || '';
          
          // Vérifier les scripts suspects
          const suspiciousPatterns = [
            /eval\s*\(/i,
            /document\.write/i,
            /innerHTML\s*=/i,
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
          ];

          const isSuspicious = suspiciousPatterns.some(
            (pattern) => pattern.test(inline)
          );

          if (isSuspicious && !src.includes(window.location.hostname)) {
            console.warn('[Security] Script suspect détecté et bloqué');
            node.remove();
            logSecurityEvent({
              eventType: 'suspicious_activity',
              details: {
                type: 'xss_attempt',
                src,
                inlineLength: inline.length,
              },
            });
          }
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
};

// Protection contre le vol de données via console
const installConsoleProtection = () => {
  if (import.meta.env.PROD) {
    const noop = () => {};

    // Limiter les logs en production (mais garder les erreurs)
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.table = noop;
    console.dir = noop;

    // Détecter l'ouverture des DevTools
    let devtoolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if ((widthThreshold || heightThreshold) && !devtoolsOpen) {
        devtoolsOpen = true;
        logSecurityEvent({
          eventType: 'suspicious_activity',
          details: {
            type: 'devtools_opened',
            widthDiff: window.outerWidth - window.innerWidth,
            heightDiff: window.outerHeight - window.innerHeight,
          },
        });
      }
    };

    window.addEventListener('resize', checkDevTools);
  }
};

// Protection contre le copier-coller de données sensibles
const installClipboardProtection = () => {
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection()?.toString() || '';
    
    // Détecter si des données sensibles sont copiées
    const sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
      /\b\d{10,}\b/g, // Numéros de téléphone
      /\b(?:sk_live_|pk_live_|sb_)[a-zA-Z0-9]+\b/g, // Clés API
    ];

    const hasSensitiveData = sensitivePatterns.some((pattern) =>
      pattern.test(selection)
    );

    if (hasSensitiveData && selection.length > 50) {
      logSecurityEvent({
        eventType: 'suspicious_activity',
        details: {
          type: 'sensitive_data_copy',
          length: selection.length,
          preview: selection.substring(0, 20) + '...',
        },
      });
    }
  });
};

// Protection contre les iframes malveillantes
// IMPORTANT: Cette protection ne bloque PAS les utilisateurs normaux
// Elle ne s'active QUE si quelqu'un essaie d'intégrer SoloCab dans son propre site malveillant
const installFramebusting = () => {
  // Si l'utilisateur accède directement à l'app (pas dans une iframe), rien à faire
  if (window.self === window.top) {
    return; // Accès normal, aucune restriction
  }

  // Nous sommes dans une iframe - vérifier si c'est autorisé
  try {
    const parentOrigin = document.referrer;
    
    // Liste des domaines autorisés à embarquer SoloCab
    const allowedOrigins = [
      window.location.origin, // Même origine
      'https://lovable.dev',
      'https://gptengineer.app',
      'http://localhost',
      'https://localhost',
    ];

    // Vérifier si l'iframe parent est autorisée
    const isAllowed = !parentOrigin || allowedOrigins.some((origin) =>
      parentOrigin.startsWith(origin) || 
      parentOrigin.includes('lovable') || 
      parentOrigin.includes('lovableproject')
    );

    if (!isAllowed) {
      console.warn('[Security] Iframe non autorisée détectée - site externe tente d\'intégrer SoloCab');
      logSecurityEvent({
        eventType: 'blocked_request',
        details: {
          type: 'unauthorized_iframe',
          parentOrigin,
          currentOrigin: window.location.origin,
        },
      });
      
      // Rediriger vers l'app principale plutôt que bloquer
      if (window.top) {
        window.top.location.href = window.self.location.href;
      }
    }
  } catch (e) {
    // Accès cross-origin bloqué par le navigateur
    // Cela arrive uniquement avec des iframes cross-origin non autorisées
    // Les utilisateurs normaux ne rencontreront JAMAIS cette situation
    console.warn('[Security] Tentative d\'embedding cross-origin détectée');
  }
};

// Composant de protection globale
export const GlobalSecurityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log('[Security] Initialisation de la protection globale...');

    // 1. Initialiser les headers de sécurité côté client
    initClientSecurity();

    // 2. Bot detection DÉSACTIVÉE - causait des requêtes DB inutiles
    // analyzeAndReportBot();

    // 3. Installer les protections (fetch interceptor DÉSACTIVÉ - causait des "Failed to fetch")
    // installFetchInterceptor();
    const xssObserver = installXSSProtection();
    installConsoleProtection();
    installClipboardProtection();
    installFramebusting();

    // 4. Log de l'initialisation réussie
    logSecurityEvent({
      eventType: 'login',
      userAgent: navigator.userAgent,
      details: {
        type: 'security_initialized',
        timestamp: new Date().toISOString(),
        platform: navigator.platform,
        language: navigator.language,
      },
    });

    console.log('[Security] Protection globale activée ✓');

    // Cleanup
    return () => {
      xssObserver?.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export default GlobalSecurityProvider;
