import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, TrendingUp, Award, Trophy } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CustomerLoyalty {
  customer_id: string;
  customer_name: string;
  points_balance: number;
  lifetime_points: number;
  tier_name: string | null;
  tier_color: string | null;
}

export const LoyaltyOverview = () => {
  const { user } = useBusiness();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeRedemptions: 0,
    totalPointsIssued: 0,
    loading: true,
  });
  const [topMembers, setTopMembers] = useState<CustomerLoyalty[]>([]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchTopMembers();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [membersRes, redemptionsRes, pointsRes] = await Promise.all([
        supabase
          .from("customer_loyalty_points")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase
          .from("loyalty_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("status", "pending"),
        supabase
          .from("customer_loyalty_points")
          .select("lifetime_points")
          .eq("user_id", user!.id),
      ]);

      const totalPoints = pointsRes.data?.reduce((sum, p) => sum + p.lifetime_points, 0) || 0;

      setStats({
        totalMembers: membersRes.count || 0,
        activeRedemptions: redemptionsRes.count || 0,
        totalPointsIssued: totalPoints,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching loyalty stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchTopMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_loyalty_points")
        .select(`
          customer_id,
          points_balance,
          lifetime_points,
          customers!inner(name),
          loyalty_tiers(name, color)
        `)
        .eq("user_id", user!.id)
        .order("lifetime_points", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
        customer_id: item.customer_id,
        customer_name: item.customers.name,
        points_balance: item.points_balance,
        lifetime_points: item.lifetime_points,
        tier_name: item.loyalty_tiers?.name || null,
        tier_color: item.loyalty_tiers?.color || null,
      })) || [];

      setTopMembers(formatted);
    } catch (error) {
      console.error("Error fetching top members:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Total Members"
          value={stats.loading ? "..." : stats.totalMembers}
          icon={Users}
        />
        <StatsCard
          title="Active Redemptions"
          value={stats.loading ? "..." : stats.activeRedemptions}
          icon={Gift}
        />
        <StatsCard
          title="Points Issued"
          value={stats.loading ? "..." : stats.totalPointsIssued.toLocaleString()}
          icon={TrendingUp}
        />
        <StatsCard
          title="Engagement"
          value={stats.loading ? "..." : `${stats.totalMembers > 0 ? Math.round((stats.activeRedemptions / stats.totalMembers) * 100) : 0}%`}
          icon={Award}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Loyalty Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No loyalty members yet. Start rewarding your customers!
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {topMembers.map((member, index) => (
                <div
                  key={member.customer_id}
                  className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                    {index + 1}
                  </div>
                  <Avatar className="hidden sm:flex">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {member.customer_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm sm:text-base">
                      {member.customer_name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {member.lifetime_points} pts
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-foreground text-sm sm:text-base">
                      {member.points_balance}
                    </p>
                    {member.tier_name && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: member.tier_color || undefined,
                          color: member.tier_color || undefined,
                        }}
                      >
                        {member.tier_name}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
