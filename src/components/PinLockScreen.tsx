import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, User, Shield, Delete, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useStaffAuthContext, ActiveStaffSession } from "@/contexts/StaffAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PinLockScreenProps {
  onUnlock: (staffSession: ActiveStaffSession) => void;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  position: string;
  is_active: boolean;
  pin: string | null;
}

export const PinLockScreen = ({ onUnlock }: PinLockScreenProps) => {
  const [pin, setPin] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [isAdminSelected, setIsAdminSelected] = useState(true); // Admin selected by default
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useBusiness();
  const { setActiveStaff } = useStaffAuthContext();

  useEffect(() => {
    if (user) {
      fetchStaff();
      fetchAdminPin();
    }
  }, [user]);

  // Keyboard support — type digits, Backspace, Escape
  // Uses functional setState to always read the latest pin value (avoids stale closure)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setPin(prev => {
          if (prev.length >= 4) return prev;
          const newPin = prev + e.key;
          if (newPin.length === 4) {
            setTimeout(() => verifyPin(newPin), 150);
          }
          return newPin;
        });
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        setPin('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminSelected, selectedStaff, adminPin]);

  const fetchStaff = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, email, position, is_active, pin")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchAdminPin = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("admin_pin")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setAdminPin(data?.admin_pin || null);
    } catch (error) {
      console.error("Error fetching admin PIN:", error);
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => verifyPin(newPin), 150);
      }
    }
  };

  const verifyPin = (enteredPin: string) => {
    if (isAdminSelected) {
      if (adminPin && adminPin === enteredPin) {
        setIsSuccess(true);
        const adminSession: ActiveStaffSession = {
          staffId: 'admin',
          staffName: 'Admin',
          position: 'Administrator',
          isAdmin: true,
        };
        setActiveStaff(adminSession);
        toast({
          title: "Welcome back!",
          description: "Admin access granted",
        });
        setTimeout(() => onUnlock(adminSession), 500);
      } else {
        triggerError();
      }
      return;
    }

    if (!selectedStaff) {
      toast({
        title: "Select an account",
        description: "Please choose admin or a staff member first",
        variant: "destructive",
      });
      setPin("");
      return;
    }

    if (!selectedStaff.pin) {
      toast({
        title: "No PIN configured",
        description: "This staff member doesn't have a PIN set up",
        variant: "destructive",
      });
      setPin("");
      return;
    }

    if (selectedStaff.pin === enteredPin) {
      setIsSuccess(true);
      const staffSession: ActiveStaffSession = {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        position: selectedStaff.position,
        isAdmin: false,
      };
      setActiveStaff(staffSession);
      toast({
        title: "Welcome back!",
        description: `Signed in as ${selectedStaff.name}`,
      });
      setTimeout(() => onUnlock(staffSession), 500);
    } else {
      triggerError();
    }
  };

  const triggerError = () => {
    setIsShaking(true);
    toast({
      title: "Incorrect PIN",
      description: "Please try again",
      variant: "destructive",
    });
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
    }, 500);
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const activeStaff = staff.filter(s => s.is_active);
  const allStaff = staff;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const StaffCard = ({ member, isAdmin = false }: { member?: StaffMember; isAdmin?: boolean }) => {
    const isSelected = isAdmin ? isAdminSelected : selectedStaff?.id === member?.id;
    
    return (
      <button
        onClick={() => {
          if (isAdmin) {
            setSelectedStaff(null);
            setIsAdminSelected(true);
          } else if (member) {
            setSelectedStaff(member);
            setIsAdminSelected(false);
          }
          setPin("");
        }}
        className={cn(
          "group relative p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300",
          "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
          isSelected
            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
            : "border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80"
        )}
      >
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <div className="relative">
            <Avatar className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-300",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}>
              <AvatarFallback className={cn(
                "text-sm sm:text-base font-bold transition-colors duration-300",
                isAdmin 
                  ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
              )}>
                {isAdmin ? <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> : getInitials(member?.name || "")}
              </AvatarFallback>
            </Avatar>
            {member && !member.is_active && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] bg-muted"
              >
                Off
              </Badge>
            )}
            {isSelected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
          <div className="text-center space-y-0.5">
            <p className={cn(
              "font-semibold text-xs sm:text-sm transition-colors truncate max-w-[80px] sm:max-w-[100px]",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {isAdmin ? "Admin" : member?.name}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-[100px]">
              {isAdmin ? "Master Access" : member?.position}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className={cn(
        "relative w-full max-w-4xl space-y-4 sm:space-y-6 py-4 sm:py-0",
        isSuccess && "animate-pulse"
      )}>
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-3">
          <div className={cn(
            "inline-flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl",
            "bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm",
            "border border-primary/20 shadow-lg shadow-primary/10",
            "transition-all duration-500",
            isSuccess && "scale-110 bg-green-500/20 border-green-500/30"
          )}>
            <Lock className={cn(
              "w-6 h-6 sm:w-9 sm:h-9 transition-colors duration-300",
              isSuccess ? "text-green-500" : "text-primary"
            )} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">
              {profile?.business_name || "Welcome Back"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Select your account and enter PIN to continue
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Staff Selection */}
          <div className="order-2 lg:order-1 space-y-3 sm:space-y-4">
            <div className="rounded-2xl sm:rounded-3xl bg-card/30 backdrop-blur-md border border-border/50 p-3 sm:p-4 shadow-xl">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10 rounded-xl bg-muted/50">
                  <TabsTrigger value="active" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-sm">
                    Active ({activeStaff.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-[hsl(225_60%_25%)] data-[state=active]:text-white data-[state=active]:shadow-sm">
                    All ({allStaff.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-3 sm:mt-4">
                  <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[200px] sm:max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                    {adminPin && <StaffCard isAdmin />}
                    {activeStaff.map((member) => (
                      <StaffCard key={member.id} member={member} />
                    ))}
                    {!adminPin && activeStaff.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                        No active staff members
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="all" className="mt-3 sm:mt-4">
                  <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[200px] sm:max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                    {adminPin && <StaffCard isAdmin />}
                    {allStaff.map((member) => (
                      <StaffCard key={member.id} member={member} />
                    ))}
                    {!adminPin && allStaff.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                        No staff members found
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* PIN Entry */}
          <div className="order-1 lg:order-2 space-y-3 sm:space-y-4">
            <div className="rounded-2xl sm:rounded-3xl bg-card/30 backdrop-blur-md border border-border/50 p-4 sm:p-6 shadow-xl">
              {/* Selected Account Display */}
              <div className={cn(
                "p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 transition-all duration-300",
                isAdminSelected
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20"
                  : selectedStaff
                    ? "bg-muted/30 border border-border/50"
                    : "bg-muted/20 border border-dashed border-border/50"
              )}>
                {isAdminSelected ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 sm:w-14 sm:h-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        <Shield className="w-5 h-5 sm:w-7 sm:h-7" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base text-foreground">Admin Access</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Enter master PIN</p>
                    </div>
                    <Badge className="hidden sm:flex bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                      Master
                    </Badge>
                  </div>
                ) : selectedStaff ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 sm:w-14 sm:h-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm sm:text-lg">
                        {getInitials(selectedStaff.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base text-foreground truncate">{selectedStaff.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedStaff.position}</p>
                    </div>
                    {selectedStaff.is_active && (
                      <Badge className="hidden sm:flex bg-green-500/10 text-green-600 border-green-500/20">
                        Active
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-muted/50 flex items-center justify-center">
                      <User className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">No account selected</p>
                      <p className="text-xs sm:text-sm">Choose from the list below</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PIN Dots */}
              <div className={cn(
                "flex justify-center gap-3 sm:gap-4 py-4 sm:py-6 transition-transform duration-100",
                isShaking && "animate-[shake_0.5s_ease-in-out]"
              )}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-200",
                      i < pin.length
                        ? isSuccess
                          ? "bg-green-500 scale-110 shadow-lg shadow-green-500/50"
                          : "bg-primary scale-110 shadow-lg shadow-primary/50"
                        : "bg-muted border-2 border-muted-foreground/30"
                    )}
                    style={{
                      transitionDelay: i < pin.length ? `${i * 50}ms` : '0ms'
                    }}
                  />
                ))}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    className={cn(
                      "h-12 sm:h-16 text-lg sm:text-2xl font-semibold rounded-xl sm:rounded-2xl",
                      "bg-card/50 backdrop-blur-sm border-border/50",
                      "hover:bg-primary/10 hover:border-primary/30 hover:scale-[1.02]",
                      "active:scale-95 transition-all duration-150"
                    )}
                    onClick={() => handleNumberClick(num.toString())}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 sm:h-16 rounded-xl sm:rounded-2xl",
                    "bg-destructive/5 backdrop-blur-sm border-destructive/20",
                    "hover:bg-destructive/10 hover:border-destructive/30 hover:scale-[1.02]",
                    "active:scale-95 transition-all duration-150"
                  )}
                  onClick={handleClear}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-destructive/70" />
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 sm:h-16 text-lg sm:text-2xl font-semibold rounded-xl sm:rounded-2xl",
                    "bg-card/50 backdrop-blur-sm border-border/50",
                    "hover:bg-primary/10 hover:border-primary/30 hover:scale-[1.02]",
                    "active:scale-95 transition-all duration-150"
                  )}
                  onClick={() => handleNumberClick("0")}
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 sm:h-16 rounded-xl sm:rounded-2xl",
                    "bg-muted/30 backdrop-blur-sm border-border/50",
                    "hover:bg-muted/50 hover:scale-[1.02]",
                    "active:scale-95 transition-all duration-150"
                  )}
                  onClick={handleBackspace}
                >
                  <Delete className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
              Enter your 4-digit PIN to unlock
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
