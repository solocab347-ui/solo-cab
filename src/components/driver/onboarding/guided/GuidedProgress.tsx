import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
  icon: string;
}

interface GuidedProgressProps {
  sections: Section[];
  currentSection: string;
  completedSections: string[];
}

export function GuidedProgress({
  sections,
  currentSection,
  completedSections
}: GuidedProgressProps) {
  const currentIndex = sections.findIndex(s => s.id === currentSection);

  return (
    <div className="flex items-center justify-between px-2 py-3 bg-muted/30 rounded-xl">
      {sections.map((section, index) => {
        const isCompleted = completedSections.includes(section.id);
        const isCurrent = section.id === currentSection;
        const isPending = index > currentIndex;

        return (
          <div key={section.id} className="flex items-center">
            {/* Section indicator */}
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
                backgroundColor: isCompleted 
                  ? 'hsl(var(--primary))' 
                  : isCurrent 
                    ? 'hsl(var(--primary) / 0.2)' 
                    : 'hsl(var(--muted))'
              }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <span className={cn(
                "text-lg",
                isCompleted && "brightness-0 invert"
              )}>
                {section.icon}
              </span>
            </motion.div>

            {/* Connector line */}
            {index < sections.length - 1 && (
              <div className="w-8 h-0.5 mx-1">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ 
                    scaleX: isCompleted ? 1 : 0,
                    backgroundColor: 'hsl(var(--primary))'
                  }}
                  className="h-full origin-left bg-muted"
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
