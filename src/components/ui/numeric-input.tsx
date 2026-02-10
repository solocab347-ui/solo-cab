import * as React from "react";
import { cn } from "@/lib/utils";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * NumericInput - Input numérique qui permet la suppression complète des valeurs
 * Contrairement à input type="number", ce composant permet de vider complètement le champ
 * et de taper librement des chiffres sans avoir le 0 initial qui reste
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, allowEmpty = true, allowNegative = false, min, max, step = 0.01, ...props }, ref) => {
    // Convertir la valeur en string pour l'affichage
    // Permettre d'afficher "0" quand c'est explicitement tapé par l'utilisateur
    const displayValue = React.useMemo(() => {
      if (value === null || value === undefined || value === "") {
        return "";
      }
      // Si c'est un nombre, le convertir en string (y compris 0)
      if (typeof value === "number") {
        return value.toString();
      }
      // Si c'est déjà une string, la retourner telle quelle
      return value;
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Permettre la suppression complète
      if (inputValue === "") {
        onChange("");
        return;
      }
      
      // Permettre le signe négatif seul si allowNegative
      if (inputValue === "-" && allowNegative) {
        onChange(inputValue);
        return;
      }
      
      // Permettre le point décimal seul ou après chiffres
      if (inputValue === "." || inputValue === "0.") {
        onChange(inputValue);
        return;
      }
      
      // Valider que c'est un nombre valide
      const numericRegex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
      if (numericRegex.test(inputValue)) {
        // Supprimer les zéros en début si ce n'est pas "0." ou "0"
        let cleanValue = inputValue;
        if (cleanValue.match(/^0\d/) && !cleanValue.startsWith("0.")) {
          cleanValue = cleanValue.replace(/^0+/, "");
        }
        onChange(cleanValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Si vide et allowEmpty, garder vide
      if (inputValue === "" || inputValue === "-" || inputValue === ".") {
        onChange(allowEmpty ? "" : "0");
        // Appeler le onBlur original si présent
        if (props.onBlur) {
          props.onBlur(e);
        }
        return;
      }
      
      // Parser et formater le nombre
      let num = parseFloat(inputValue);
      if (isNaN(num)) {
        onChange(allowEmpty ? "" : "0");
        if (props.onBlur) {
          props.onBlur(e);
        }
        return;
      }
      
      // Appliquer min/max
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      
      // Formater avec les décimales appropriées
      const formattedValue = Number.isInteger(num) ? num.toString() : num.toString();
      onChange(formattedValue);
      
      // Appeler le onBlur original si présent
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Sélectionner tout le contenu au focus pour faciliter le remplacement
      e.target.select();
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-lg font-semibold text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
