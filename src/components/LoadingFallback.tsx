import { Loader2 } from "lucide-react";

export const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};