/**
 * DÉTECTION DE BOTS ET FINGERPRINTING
 * Protection contre les automatisations malveillantes
 */

import { createSecurityAlert, logSecurityEvent } from './securityCore';

// Indicateurs de bots
interface BotIndicators {
  isWebDriver: boolean;
  isHeadless: boolean;
  hasAutomationFlags: boolean;
  hasPhantomJS: boolean;
  hasNightmare: boolean;
  hasSelenium: boolean;
  hasPuppeteer: boolean;
  isInconsistentBrowser: boolean;
  missingPlugins: boolean;
  suspiciousUserAgent: boolean;
  noWebGL: boolean;
  noCanvas: boolean;
}

// Score de risque pour chaque indicateur
const RISK_SCORES: Record<keyof BotIndicators, number> = {
  isWebDriver: 30,
  isHeadless: 25,
  hasAutomationFlags: 25,
  hasPhantomJS: 20,
  hasNightmare: 20,
  hasSelenium: 20,
  hasPuppeteer: 15,
  isInconsistentBrowser: 15,
  missingPlugins: 10,
  suspiciousUserAgent: 15,
  noWebGL: 10,
  noCanvas: 10,
};

/**
 * Générer un fingerprint du navigateur
 */
export function generateBrowserFingerprint(): string {
  const components: string[] = [];

  // User Agent
  components.push(navigator.userAgent);

  // Langue
  components.push(navigator.language || 'unknown');

  // Résolution écran
  components.push(`${screen.width}x${screen.height}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Platform
  components.push(navigator.platform || 'unknown');

  // Nombre de CPU cores
  components.push(String(navigator.hardwareConcurrency || 0));

  // Mémoire (si disponible)
  const nav = navigator as Navigator & { deviceMemory?: number };
  components.push(String(nav.deviceMemory || 0));

  // Touch support
  components.push(String('ontouchstart' in window));

  // WebGL Vendor/Renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown');
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown');
      }
    }
  } catch {
    components.push('webgl-error');
  }

  // Générer hash
  const fingerprint = components.join('|');
  return hashString(fingerprint);
}

/**
 * Simple hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Détecter les indicateurs de bot
 */
export function detectBotIndicators(): BotIndicators {
  const nav = navigator as Navigator & {
    webdriver?: boolean;
    __selenium_unwrapped?: unknown;
    __webdriver_evaluate?: unknown;
    __driver_evaluate?: unknown;
  };
  
  const win = window as Window & {
    Cypress?: unknown;
    callPhantom?: unknown;
    _phantom?: unknown;
    phantom?: unknown;
    __nightmare?: unknown;
    outerWidth?: number;
    outerHeight?: number;
  };

  return {
    // WebDriver detection
    isWebDriver: !!nav.webdriver || 
                 !!win.Cypress ||
                 !!nav.__selenium_unwrapped ||
                 !!nav.__webdriver_evaluate ||
                 !!nav.__driver_evaluate,

    // Headless browser detection
    isHeadless: !win.outerWidth || !win.outerHeight ||
                win.outerWidth === 0 || win.outerHeight === 0 ||
                /HeadlessChrome/.test(navigator.userAgent),

    // Automation flags
    hasAutomationFlags: !!(document as Document & { $cdc_asdjflasutopfhvcZLmcfl_?: unknown }).$cdc_asdjflasutopfhvcZLmcfl_ ||
                        !!(document as Document & { $chrome_asyncScriptInfo?: unknown }).$chrome_asyncScriptInfo ||
                        !!(window as Window & { __webdriver_script_fn?: unknown }).__webdriver_script_fn,

    // PhantomJS
    hasPhantomJS: !!win.callPhantom || !!win._phantom || !!win.phantom,

    // Nightmare
    hasNightmare: !!win.__nightmare,

    // Selenium
    hasSelenium: !!document.querySelector('[class*="selenium"]') ||
                 !!document.querySelector('[id*="selenium"]'),

    // Puppeteer
    hasPuppeteer: /puppeteer/i.test(navigator.userAgent),

    // Browser inconsistencies
    isInconsistentBrowser: detectBrowserInconsistencies(),

    // Missing plugins (common in headless browsers)
    missingPlugins: navigator.plugins.length === 0,

    // Suspicious User Agent
    suspiciousUserAgent: detectSuspiciousUserAgent(),

    // No WebGL
    noWebGL: !detectWebGLSupport(),

    // No Canvas
    noCanvas: !detectCanvasSupport(),
  };
}

/**
 * Détecter les incohérences de navigateur
 */
function detectBrowserInconsistencies(): boolean {
  const ua = navigator.userAgent;

  // Chrome without chrome object
  if (ua.includes('Chrome') && !(window as Window & { chrome?: unknown }).chrome) {
    return true;
  }

  // Firefox without InstallTrigger
  if (ua.includes('Firefox') && typeof (window as Window & { InstallTrigger?: unknown }).InstallTrigger === 'undefined') {
    return true;
  }

  return false;
}

/**
 * Détecter les User Agents suspects
 */
function detectSuspiciousUserAgent(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const suspiciousPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'headless',
    'phantom', 'selenium', 'puppeteer', 'playwright',
    'curl', 'wget', 'python-requests', 'axios', 'node-fetch',
  ];

  return suspiciousPatterns.some(pattern => ua.includes(pattern));
}

/**
 * Vérifier le support WebGL
 */
function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Vérifier le support Canvas
 */
function detectCanvasSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('2d');
  } catch {
    return false;
  }
}

/**
 * Calculer le score de risque global
 */
export function calculateRiskScore(indicators: BotIndicators): number {
  let score = 0;

  for (const [key, isDetected] of Object.entries(indicators)) {
    if (isDetected) {
      score += RISK_SCORES[key as keyof BotIndicators] || 0;
    }
  }

  return Math.min(score, 100);
}

/**
 * Analyser et reporter si un bot est détecté
 */
export async function analyzeAndReportBot(): Promise<{
  isBot: boolean;
  riskScore: number;
  fingerprint: string;
}> {
  const indicators = detectBotIndicators();
  const riskScore = calculateRiskScore(indicators);
  const fingerprint = generateBrowserFingerprint();

  const isBot = riskScore >= 50;

  if (isBot) {
    // Log l'événement
    await logSecurityEvent({
      eventType: 'bot_detected',
      riskScore,
      details: {
        fingerprint,
        indicators,
      },
    });

    // Créer une alerte si score critique
    if (riskScore >= 70) {
      await createSecurityAlert({
        alertType: 'bot_activity',
        severity: riskScore >= 90 ? 'critical' : 'high',
        title: 'Bot automatisé détecté',
        description: `Score de risque: ${riskScore}/100. Fingerprint: ${fingerprint}`,
        metadata: { fingerprint, indicators, riskScore },
      });
    }
  }

  return { isBot, riskScore, fingerprint };
}

/**
 * Hook pour vérifier périodiquement les comportements suspects
 */
let lastCheckTime = 0;
let requestCount = 0;

export function trackRequestPattern(): void {
  const now = Date.now();

  if (now - lastCheckTime > 1000) {
    // Nouvelle seconde
    if (requestCount > 20) {
      // Plus de 20 requêtes par seconde = suspect
      logSecurityEvent({
        eventType: 'unusual_pattern',
        riskScore: 60,
        details: {
          reason: 'high_request_rate',
          requestsPerSecond: requestCount,
        },
      });
    }

    requestCount = 0;
    lastCheckTime = now;
  }

  requestCount++;
}
