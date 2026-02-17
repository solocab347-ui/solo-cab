 import { motion } from 'framer-motion';
 import { Sparkles, Quote } from 'lucide-react';
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';
 
 interface DashboardAnchorMessageProps {
   className?: string;
 }
 
 export function DashboardAnchorMessage({ className }: DashboardAnchorMessageProps) {
   const lang = 'fr'; // TODO: get from context
   const dashboard = motivationTranslations.dashboard;
   const signatures = motivationTranslations.signatures;
   
   // Rotate through signature phrases
   const signatureKeys = Object.keys(signatures) as Array<keyof typeof signatures>;
   const randomSignature = signatures[signatureKeys[Math.floor(Math.random() * signatureKeys.length)]];
   
   return (
     <motion.div
       initial={{ opacity: 0, y: -10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5 }}
       className={`bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-xl p-4 ${className}`}
     >
       <div className="flex items-start gap-3">
         <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg shrink-0">
           <Sparkles className="w-4 h-4 text-white" />
         </div>
         <div className="flex-1 space-y-2">
           <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
             {dashboard.anchor[lang]}
           </p>
           <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
             <Quote className="w-3 h-3 text-primary/60" />
             <p className="text-xs text-primary/80 italic">
               {randomSignature[lang]}
             </p>
           </div>
         </div>
       </div>
     </motion.div>
   );
 }