import { commonTranslations } from './common';
import { authTranslations } from './auth';
import { registerTranslations } from './register';
import { driverTranslations } from './driver';
import { dashboardTranslations } from './dashboard';
import { coursesTranslations } from './courses';
import { languageTranslations } from './language';
import { fleetTranslations } from './fleet';
import { companyTranslations } from './company';
import { navigationTranslations } from './navigation';
import type { Translations } from '../types';

// Merge all translations
export const translations: Translations = {
  ...commonTranslations,
  ...authTranslations,
  ...registerTranslations,
  ...driverTranslations,
  ...dashboardTranslations,
  ...coursesTranslations,
  ...languageTranslations,
  ...fleetTranslations,
  ...companyTranslations,
  ...navigationTranslations,
};
