import { Loader2 } from "lucide-react";

export const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 auth-loading-screen">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};