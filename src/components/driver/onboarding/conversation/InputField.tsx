import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InputFieldProps {
  type: 'text' | 'number' | 'switch' | 'select';
  label: string;
  value: string | boolean;
  onChange: (value: any) => void;
  placeholder?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
  suffix?: string;
  required?: boolean;
  delay?: number;
  className?: string;
}

export function InputField({
  type,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  options,
  suffix,
  required,
  delay = 0,
  className
}: InputFieldProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.1 }}
      className={cn("space-y-2", className)}
    >
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {type === 'text' && (
        <Input
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 text-base"
        />
      )}

      {type === 'number' && (
        <div className="relative">
          <NumericInput
            value={value as string}
            onChange={onChange}
            placeholder={placeholder}
            className="h-11 text-base pr-10"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {suffix}
            </span>
          )}
        </div>
      )}

      {type === 'switch' && (
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">{placeholder}</span>
          <Switch
            checked={value as boolean}
            onCheckedChange={onChange}
          />
        </div>
      )}

      {type === 'select' && options && (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Badge
              key={option.value}
              variant={value === option.value ? "default" : "outline"}
              className={cn(
                "px-4 py-2 cursor-pointer transition-all",
                value === option.value 
                  ? "bg-primary" 
                  : "hover:bg-muted"
              )}
              onClick={() => onChange(option.value)}
            >
              {value === option.value && <Check className="w-3 h-3 mr-1.5" />}
              {option.label}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}
