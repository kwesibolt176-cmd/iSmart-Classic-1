import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ShoppingBag, Gift, Star, User, Phone, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

interface CustomerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

interface LoyaltyPoints {
  points_balance: number;
  lifetime_points: number;
  current_tier?: { name: string; color: string } | null;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
}

const CustomerPortal = () => {
  const [searchParams] = useSearchParams();
  const { format: formatCurrency } = useCurrency();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyPoints | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const bid = searchParams.get("business");
    const token = searchParams.get("token");
    if (bid) {
      setBusinessId(bid);
    }
    if (token) {
      setSessionToken(token);
      validateSession(token);
    }
  }, [searchParams]);

  const validateSession = async (token: string) => {
    setIsLoading(true);
    
    const { data: session, error: sessionError } = await supabase
      .from('customer_portal_sessions')
      .select('customer_id, expires_at')
      .eq('session_token', token)
      .maybeSingle();

    if (sessionError || !session || new Date(session.expires_at) < new Date()) {
      setError("Session expired or invalid. Please enter your phone number to continue.");
      setIsLoading(false);
      return;
    }

    await loadCustomerData(session.customer_id);
  };

  const lookupCustomer = async () => {
    if (!phone || !businessId) return;
    
    setIsLoading(true);
    setError("");

    // Lookup customer by phone using service role via edge function or direct query
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('user_id', businessId)
      .eq('phone', phone)
      .maybeSingle();

    if (customerError || !customerData) {
      setError("No account found with this phone number");
      setIsLoading(false);
      return;
    }

    // Create a session token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour session

    const { error: sessionError } = await supabase
      .from('customer_portal_sessions')
      .insert({
        customer_id: customerData.id,
        business_user_id: businessId,
        session_token: token,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
    }

    setSessionToken(token);
    await loadCustomerData(customerData.id);
  };

  const loadCustomerData = async (customerId: string) => {
    // Fetch customer details
    const { data: customerData } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', customerId)
      .single();

    if (customerData) {
      setCustomer(customerData);
    }

    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, order_number, total, status, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);

    setOrders(ordersData || []);

    // Fetch loyalty points
    const { data: loyaltyData } = await supabase
      .from('customer_loyalty_points')
      .select('points_balance, lifetime_points, current_tier_id, loyalty_tiers(name, color)')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (loyaltyData) {
      setLoyalty({
        points_balance: loyaltyData.points_balance,
        lifetime_points: loyaltyData.lifetime_points,
        current_tier: loyaltyData.loyalty_tiers as any
      });

      // Fetch available rewards for the business
      if (businessId) {
        const { data: rewardsData } = await supabase
          .from('loyalty_rewards')
          .select('id, name, description, points_cost, reward_type')
          .eq('user_id', businessId)
          .eq('is_active', true)
          .order('points_cost', { ascending: true });

        setRewards(rewardsData || []);
      }
    }

    setIsLoading(false);
  };

  const redeemReward = async (reward: Reward) => {
    if (!customer || !loyalty || !businessId) return;
    
    if (loyalty.points_balance < reward.points_cost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.points_cost - loyalty.points_balance} more points to redeem this reward.`,
        variant: "destructive"
      });
      return;
    }

    setIsRedeeming(reward.id);

    try {
      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .insert({
          user_id: businessId,
          customer_id: customer.id,
          reward_id: reward.id,
          points_spent: reward.points_cost,
          status: 'pending'
        });

      if (redemptionError) throw redemptionError;

      // Update points balance
      const newBalance = loyalty.points_balance - reward.points_cost;
      const { error: pointsError } = await supabase
        .from('customer_loyalty_points')
        .update({ points_balance: newBalance })
        .eq('customer_id', customer.id);

      if (pointsError) throw pointsError;

      // Create loyalty transaction
      await supabase
        .from('loyalty_transactions')
        .insert({
          user_id: businessId,
          customer_id: customer.id,
          transaction_type: 'redeemed',
          points_amount: -reward.points_cost,
          balance_after: newBalance,
          notes: `Redeemed: ${reward.name}`
        });

      setLoyalty({ ...loyalty, points_balance: newBalance });

      toast({
        title: "Reward Redeemed!",
        description: `You've successfully redeemed "${reward.name}". Show this to the staff to claim your reward.`
      });
    } catch (err) {
      console.error('Redemption error:', err);
      toast({
        title: "Redemption Failed",
        description: "Could not redeem reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(null);
    }
  };

  const signOut = () => {
    setCustomer(null);
    setOrders([]);
    setLoyalty(null);
    setRewards([]);
    setSessionToken(null);
    setPhone("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'delivered': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Invalid portal link. Please contact the business for a valid link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Customer Portal</CardTitle>
            <CardDescription>
              Enter your phone number to access your account, view orders, and redeem rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && lookupCustomer()}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            <Button onClick={lookupCustomer} className="w-full" disabled={isLoading || !phone}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Looking up...
                </>
              ) : (
                "Access My Account"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points Balance</p>
                  <p className="text-2xl font-bold">{loyalty?.points_balance || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Gift className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tier Status</p>
                  <p className="text-2xl font-bold">{loyalty?.current_tier?.name || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="loyalty">My Points</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No orders yet. Start shopping to see your order history here!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(order.total)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            {rewards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  No rewards available at this time. Check back soon!
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{reward.name}</h3>
                          {reward.description && (
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary">{reward.reward_type}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{reward.points_cost} pts</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => redeemReward(reward)}
                          disabled={
                            isRedeeming === reward.id ||
                            (loyalty?.points_balance || 0) < reward.points_cost
                          }
                        >
                          {isRedeeming === reward.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (loyalty?.points_balance || 0) < reward.points_cost ? (
                            `Need ${reward.points_cost - (loyalty?.points_balance || 0)} more`
                          ) : (
                            "Redeem"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="loyalty">
            <Card>
              <CardHeader>
                <CardTitle>Your Loyalty Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-3xl font-bold text-primary">{loyalty?.points_balance || 0}</p>
                    <p className="text-sm text-muted-foreground">Available Points</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-3xl font-bold">{loyalty?.lifetime_points || 0}</p>
                    <p className="text-sm text-muted-foreground">Lifetime Points</p>
                  </div>
                </div>
                {loyalty?.current_tier && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Current Tier</p>
                    <p className="text-xl font-bold" style={{ color: loyalty.current_tier.color }}>
                      {loyalty.current_tier.name}
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  Earn points with every purchase and redeem them for exclusive rewards!
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerPortal;
