// Internationalization system for SoloCab
type Locale = 'fr' | 'en' | 'zh';

interface Translations {
  [key: string]: {
    fr: string;
    en: string;
    zh: string;
  };
}

export const translations: Translations = {
  // Common
  'common.loading': {
    fr: 'Chargement...',
    en: 'Loading...',
    zh: '加载中...',
  },
  'common.error': {
    fr: 'Erreur',
    en: 'Error',
    zh: '错误',
  },
  'common.success': {
    fr: 'Succès',
    en: 'Success',
    zh: '成功',
  },
  'common.cancel': {
    fr: 'Annuler',
    en: 'Cancel',
    zh: '取消',
  },
  'common.save': {
    fr: 'Enregistrer',
    en: 'Save',
    zh: '保存',
  },
  'common.confirm': {
    fr: 'Confirmer',
    en: 'Confirm',
    zh: '确认',
  },
  'common.back': {
    fr: 'Retour',
    en: 'Back',
    zh: '返回',
  },
  'common.next': {
    fr: 'Suivant',
    en: 'Next',
    zh: '下一步',
  },
  'common.yes': {
    fr: 'Oui',
    en: 'Yes',
    zh: '是',
  },
  'common.no': {
    fr: 'Non',
    en: 'No',
    zh: '否',
  },

  // Auth
  'auth.login': {
    fr: 'Connexion',
    en: 'Login',
    zh: '登录',
  },
  'auth.logout': {
    fr: 'Déconnexion',
    en: 'Logout',
    zh: '退出',
  },
  'auth.register': {
    fr: "S'inscrire",
    en: 'Sign up',
    zh: '注册',
  },
  'auth.email': {
    fr: 'Email',
    en: 'Email',
    zh: '电子邮件',
  },
  'auth.password': {
    fr: 'Mot de passe',
    en: 'Password',
    zh: '密码',
  },
  'auth.confirmPassword': {
    fr: 'Confirmer le mot de passe',
    en: 'Confirm password',
    zh: '确认密码',
  },
  'auth.passwordMismatch': {
    fr: 'Les mots de passe ne correspondent pas',
    en: 'Passwords do not match',
    zh: '密码不匹配',
  },
  'auth.passwordMinLength': {
    fr: 'Le mot de passe doit contenir au moins 6 caractères',
    en: 'Password must be at least 6 characters',
    zh: '密码至少需要6个字符',
  },

  // Client Registration
  'register.title': {
    fr: 'Inscription Client',
    en: 'Client Registration',
    zh: '客户注册',
  },
  'register.subtitle': {
    fr: 'Complétez vos informations pour finaliser l\'inscription',
    en: 'Complete your information to finalize registration',
    zh: '完成您的信息以完成注册',
  },
  'register.fullName': {
    fr: 'Nom complet',
    en: 'Full name',
    zh: '全名',
  },
  'register.phone': {
    fr: 'Téléphone',
    en: 'Phone',
    zh: '电话',
  },
  'register.address': {
    fr: 'Adresse de mon domicile',
    en: 'My home address',
    zh: '我的家庭地址',
  },
  'register.addressHint': {
    fr: 'Cette adresse facilitera la réservation de vos courses',
    en: 'This address will make booking your rides easier',
    zh: '此地址将使预订您的行程更容易',
  },
  'register.submit': {
    fr: "S'inscrire",
    en: 'Sign up',
    zh: '注册',
  },
  'register.submitting': {
    fr: 'Inscription en cours...',
    en: 'Registering...',
    zh: '注册中...',
  },
  'register.success': {
    fr: 'Inscription réussie ! Bienvenue chez SoloCab',
    en: 'Registration successful! Welcome to SoloCab',
    zh: '注册成功！欢迎来到SoloCab',
  },
  'register.joinDriver': {
    fr: 'Rejoignez votre chauffeur VTC',
    en: 'Join your VTC driver',
    zh: '加入您的VTC司机',
  },
  'register.discoverDriver': {
    fr: 'Découvrez le profil de votre chauffeur',
    en: 'Discover your driver\'s profile',
    zh: '了解您司机的个人资料',
  },
  'register.withThisDriver': {
    fr: 'S\'inscrire avec ce chauffeur',
    en: 'Sign up with this driver',
    zh: '与此司机注册',
  },
  'register.exclusiveNote': {
    fr: 'En vous inscrivant, vous deviendrez client exclusif de ce chauffeur',
    en: 'By registering, you will become an exclusive client of this driver',
    zh: '注册后，您将成为此司机的专属客户',
  },

  // Driver Profile
  'driver.verified': {
    fr: 'Vérifié',
    en: 'Verified',
    zh: '已验证',
  },
  'driver.courses': {
    fr: 'course',
    en: 'ride',
    zh: '行程',
  },
  'driver.coursesPlural': {
    fr: 'courses',
    en: 'rides',
    zh: '行程',
  },
  'driver.vehicle': {
    fr: 'Véhicule',
    en: 'Vehicle',
    zh: '车辆',
  },
  'driver.presentation': {
    fr: 'Présentation',
    en: 'Presentation',
    zh: '介绍',
  },
  'driver.services': {
    fr: 'Services proposés',
    en: 'Services offered',
    zh: '提供的服务',
  },
  'driver.equipment': {
    fr: 'Équipements du véhicule',
    en: 'Vehicle equipment',
    zh: '车辆设备',
  },
  'driver.photos': {
    fr: 'Photos du véhicule',
    en: 'Vehicle photos',
    zh: '车辆照片',
  },

  // Client Dashboard
  'dashboard.home': {
    fr: 'Accueil',
    en: 'Home',
    zh: '首页',
  },
  'dashboard.myCourses': {
    fr: 'Mes courses',
    en: 'My rides',
    zh: '我的行程',
  },
  'dashboard.myDriver': {
    fr: 'Mon chauffeur',
    en: 'My driver',
    zh: '我的司机',
  },
  'dashboard.quotes': {
    fr: 'Devis',
    en: 'Quotes',
    zh: '报价',
  },
  'dashboard.invoices': {
    fr: 'Factures',
    en: 'Invoices',
    zh: '发票',
  },
  'dashboard.messages': {
    fr: 'Messages',
    en: 'Messages',
    zh: '消息',
  },
  'dashboard.profile': {
    fr: 'Profil',
    en: 'Profile',
    zh: '个人资料',
  },
  'dashboard.settings': {
    fr: 'Paramètres',
    en: 'Settings',
    zh: '设置',
  },
  'dashboard.newCourse': {
    fr: 'Nouvelle course',
    en: 'New ride',
    zh: '新行程',
  },

  // Courses
  'course.pickup': {
    fr: 'Départ',
    en: 'Pickup',
    zh: '上车点',
  },
  'course.destination': {
    fr: 'Destination',
    en: 'Destination',
    zh: '目的地',
  },
  'course.date': {
    fr: 'Date',
    en: 'Date',
    zh: '日期',
  },
  'course.time': {
    fr: 'Heure',
    en: 'Time',
    zh: '时间',
  },
  'course.passengers': {
    fr: 'Passagers',
    en: 'Passengers',
    zh: '乘客',
  },
  'course.notes': {
    fr: 'Notes',
    en: 'Notes',
    zh: '备注',
  },
  'course.status.pending': {
    fr: 'En attente',
    en: 'Pending',
    zh: '待处理',
  },
  'course.status.accepted': {
    fr: 'Acceptée',
    en: 'Accepted',
    zh: '已接受',
  },
  'course.status.inProgress': {
    fr: 'En cours',
    en: 'In progress',
    zh: '进行中',
  },
  'course.status.completed': {
    fr: 'Terminée',
    en: 'Completed',
    zh: '已完成',
  },
  'course.status.cancelled': {
    fr: 'Annulée',
    en: 'Cancelled',
    zh: '已取消',
  },

  // Language selector
  'language.select': {
    fr: 'Langue',
    en: 'Language',
    zh: '语言',
  },
  'language.fr': {
    fr: 'Français',
    en: 'French',
    zh: '法语',
  },
  'language.en': {
    fr: 'Anglais',
    en: 'English',
    zh: '英语',
  },
  'language.zh': {
    fr: 'Chinois',
    en: 'Chinese',
    zh: '中文',
  },
};

// Get browser locale or default
export const getBrowserLocale = (): Locale => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('en')) return 'en';
  return 'fr';
};

// Get stored locale
export const getStoredLocale = (): Locale => {
  const stored = localStorage.getItem('solocab_locale');
  if (stored === 'fr' || stored === 'en' || stored === 'zh') {
    return stored;
  }
  return getBrowserLocale();
};

// Set locale
export const setLocale = (locale: Locale): void => {
  localStorage.setItem('solocab_locale', locale);
  window.dispatchEvent(new Event('localeChange'));
};

// Translation function
export const t = (key: string, locale?: Locale): string => {
  const currentLocale = locale || getStoredLocale();
  const translation = translations[key];
  
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  
  return translation[currentLocale] || translation.fr || key;
};

export type { Locale };
