import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background px-4 sm:px-6">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <span className="text-6xl sm:text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </span>
        </div>
        <h1 className="mb-2 text-xl sm:text-2xl font-bold text-foreground">
          Page Not Found
        </h1>
        <p className="mb-6 text-sm sm:text-base text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={goBack} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
