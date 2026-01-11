/**
 * SECURITY HEADERS ET CSP
 * Configuration des en-têtes de sécurité HTTP
 */

/**
 * Content Security Policy pour l'application
 * Ces directives seront appliquées via meta tags et Edge Functions
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Nécessaire pour Vite HMR en dev
    'https://js.stripe.com',
    'https://api.mapbox.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind CSS inline styles
    'https://api.mapbox.com',
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.supabase.co',
    'https://api.mapbox.com',
    'https://*.mapbox.com',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.mapbox.com',
    'https://*.mapbox.com',
    'https://api.stripe.com',
    'https://*.sentry.io',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
  ],
  'frame-ancestors': ["'self'", "https://lovable.dev", "https://*.lovable.dev", "https://*.lovableproject.com"], // Autoriser Lovable pour la prévisualisation
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Construire la chaîne CSP complète
 */
export function buildCSPString(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * En-têtes de sécurité recommandés
 */
export const SECURITY_HEADERS = {
  // Protection contre le clickjacking (SAMEORIGIN pour permettre Lovable preview)
  'X-Frame-Options': 'SAMEORIGIN',
  
  // Protection contre le MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Protection XSS (obsolète mais encore utile pour vieux navigateurs)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (limiter les fonctionnalités)
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=(self)', // Nécessaire pour la localisation
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=(self)', // Stripe
    'usb=()',
  ].join(', '),
  
  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // CSP
  'Content-Security-Policy': buildCSPString(),
};

/**
 * Appliquer les meta tags de sécurité côté client
 */
export function applySecurityMetaTags(): void {
  if (typeof document === 'undefined') return;

  // CSP via meta tag
  let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!cspMeta) {
    cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(cspMeta);
  }
  cspMeta.setAttribute('content', buildCSPString());

  // X-UA-Compatible
  let uaMeta = document.querySelector('meta[http-equiv="X-UA-Compatible"]');
  if (!uaMeta) {
    uaMeta = document.createElement('meta');
    uaMeta.setAttribute('http-equiv', 'X-UA-Compatible');
    uaMeta.setAttribute('content', 'IE=edge');
    document.head.appendChild(uaMeta);
  }

  // Referrer Policy
  let refMeta = document.querySelector('meta[name="referrer"]');
  if (!refMeta) {
    refMeta = document.createElement('meta');
    refMeta.setAttribute('name', 'referrer');
    refMeta.setAttribute('content', 'strict-origin-when-cross-origin');
    document.head.appendChild(refMeta);
  }
}

/**
 * Vérifier si la page est servie via HTTPS
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || window.location.protocol === 'https:';
}

/**
 * Vérifier si la page est embarquée dans une iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Si on ne peut pas accéder à window.top, c'est probablement une iframe cross-origin
  }
}

// Domaines autorisés pour l'embedding (Lovable preview)
const ALLOWED_IFRAME_DOMAINS = [
  'lovable.dev',
  'lovableproject.com',
  'localhost',
];

/**
 * Vérifier si le domaine parent est autorisé
 */
function isAllowedIframeDomain(): boolean {
  try {
    // En mode développement local, toujours autoriser
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }
    
    // Vérifier le referrer pour les iframes cross-origin
    const referrer = document.referrer;
    if (referrer) {
      const referrerUrl = new URL(referrer);
      return ALLOWED_IFRAME_DOMAINS.some(domain => 
        referrerUrl.hostname === domain || referrerUrl.hostname.endsWith(`.${domain}`)
      );
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Bloquer l'exécution si dans une iframe non autorisée
 * IMPORTANT: Cette fonction ne bloque JAMAIS les utilisateurs normaux
 * Elle ne s'active que pour les tentatives d'embedding malveillantes
 */
export function preventClickjacking(): void {
  // Si l'utilisateur accède directement à l'app (pas dans une iframe)
  // => AUCUNE restriction, accès normal
  if (!isInIframe()) {
    return;
  }

  // Nous sommes dans une iframe - vérifier si c'est autorisé
  // Cas 1: Même origine (toujours OK)
  try {
    if (window.top && window.top.location.hostname === window.location.hostname) {
      return; // Même origine, OK
    }
  } catch {
    // Cross-origin, continuer la vérification
  }

  // Cas 2: Domaine autorisé (Lovable, localhost)
  if (isAllowedIframeDomain()) {
    return; // Domaine autorisé, OK
  }

  // Cas 3: Iframe non autorisée - site externe tente d'intégrer SoloCab
  // SEUL ce cas est bloqué - les utilisateurs normaux ne le verront JAMAIS
  console.warn('[Security] Tentative d\'embedding non autorisée bloquée');
  
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #0f172a; color: white;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #f87171; margin-bottom: 1rem;">Accès non autorisé</h1>
        <p style="margin-bottom: 1.5rem;">Cette page ne peut pas être affichée dans un cadre externe.</p>
        <a href="${window.location.href}" target="_top" style="color: #60a5fa; text-decoration: none; padding: 0.75rem 1.5rem; border: 1px solid #60a5fa; border-radius: 0.5rem;">
          Ouvrir SoloCab
        </a>
      </div>
    </div>
  `;
}

/**
 * Initialiser toutes les protections côté client
 */
export function initClientSecurity(): void {
  if (typeof window === 'undefined') return;

  // Appliquer les meta tags
  applySecurityMetaTags();

  // Vérifier le clickjacking
  preventClickjacking();

  // Désactiver le clic droit (optionnel, décommenter si souhaité)
  // document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Détecter les outils de développement ouverts (basique)
  // Note: Cela peut être contourné, c'est juste une mesure de dissuasion
  let devtoolsOpen = false;
  const threshold = 160;
  
  const checkDevtools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if ((widthThreshold || heightThreshold) && !devtoolsOpen) {
      devtoolsOpen = true;
      console.log('%c⚠️ SoloCab Security', 'font-size: 20px; color: red;');
      console.log('%cToute tentative de manipulation sera détectée et signalée.', 'font-size: 14px;');
    }
  };

  // Vérifier périodiquement (optionnel)
  // setInterval(checkDevtools, 1000);
  
  console.log('[Security] Client-side security initialized');
}
