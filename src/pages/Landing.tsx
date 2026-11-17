import { Button } from "@/components/ui/button";

// Dynamic app URL based on current domain
const getAppUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // Map landing domains to their app counterparts
  if (hostname === 'getdowo.online' || hostname === 'www.getdowo.online') {
    return 'https://app.getdowo.online';
  }
  if (hostname === 'getdowo.com' || hostname === 'www.getdowo.com') {
    return 'https://app.getdowo.com';
  }
  // For development/preview, just use relative path
  if (hostname.includes('lovable.app') || hostname.includes('lovableproject.com') || hostname === 'localhost') {
    return '';
  }
  // Fallback
  return 'https://app.getdowo.online';
};

export const Landing = () => {
  const goToApp = () => {
    const appUrl = getAppUrl();
    window.location.href = appUrl ? `${appUrl}/auth` : '/auth';
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 safe-area-inset">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <span className="text-xl font-semibold tracking-[-0.06em] text-foreground" aria-label="iSmartPay">
              iSmart<span className="text-primary">Pay</span>
            </span>
            <Button size="sm" onClick={goToApp}>
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-4 text-4xl font-semibold tracking-[-0.07em] text-foreground sm:mb-6 sm:text-5xl" aria-label="iSmartPay">
            iSmart<span className="text-primary">Pay</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome to iSmartPay
          </h1>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
            Simplifying Collections and Payments Across Africa
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={goToApp} size="lg" className="w-full sm:w-auto">
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={goToApp}
              className="w-full sm:w-auto"
            >
              Sign In
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 text-center safe-area-inset">
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} iSmartPay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
