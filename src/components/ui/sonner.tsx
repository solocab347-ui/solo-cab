import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={6000}
      closeButton
      richColors
      expand
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:border-2",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-green-500 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950",
          error: "group-[.toaster]:border-red-500 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950",
          warning: "group-[.toaster]:border-amber-500 group-[.toaster]:bg-amber-50 dark:group-[.toaster]:bg-amber-950",
          info: "group-[.toaster]:border-blue-500 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950",
        },
      }}
      style={{ zIndex: 999999 }}
      {...props}
    />
  );
};

export { Toaster, toast };
