import { useNavigate } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import { DirectCourseCreationForm } from "@/components/driver/DirectCourseCreationForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";

const DriverCreateDirectCourse = () => {
  const navigate = useNavigate();

  // Scroll automatique en haut de la page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <NavigationHeader 
            showBack={true}
            showHome={true}
            homeRoute="/driver-dashboard"
          />

          <div className="mt-6">
            <DirectCourseCreationForm
              onSuccess={() => {
                setTimeout(() => navigate("/driver-dashboard"), 1500);
              }}
              onCancel={() => navigate("/driver-dashboard")}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DriverCreateDirectCourse;
