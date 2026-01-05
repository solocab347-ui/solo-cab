import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * NumericInput - Input numérique qui permet la suppression facile des valeurs
 * Contrairement à input type="number", ce composant permet de vider complètement le champ
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowEmpty = true, min, max, step = 0.01, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Permettre la suppression complète
      if (inputValue === "" || inputValue === "-") {
        onChange(inputValue);
        return;
      }
      
      // Valider que c'est un nombre valide
      const numericRegex = /^-?\d*\.?\d*$/;
      if (numericRegex.test(inputValue)) {
        onChange(inputValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Si vide et allowEmpty, garder vide ou mettre 0
      if (inputValue === "" || inputValue === "-") {
        onChange(allowEmpty ? "" : "0");
        return;
      }
      
      // Parser et formater le nombre
      let num = parseFloat(inputValue);
      if (isNaN(num)) {
        onChange(allowEmpty ? "" : "0");
        return;
      }
      
      // Appliquer min/max
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      
      onChange(num.toString());
      
      // Appeler le onBlur original si présent
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
