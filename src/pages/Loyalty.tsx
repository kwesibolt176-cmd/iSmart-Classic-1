import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Trophy, Users } from "lucide-react";
import { LoyaltyOverview } from "@/components/LoyaltyOverview";
import { TierManagement } from "@/components/TierManagement";
import { RewardsManagement } from "@/components/RewardsManagement";
import { PageHeader } from "@/components/ui/PageHeader";

export const Loyalty = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Loyalty Program"
        description="Reward your customers and build lasting relationships"
        rightContent={<Trophy className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tiers" className="gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Tiers</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <LoyaltyOverview />
          </TabsContent>

          <TabsContent value="tiers">
            <TierManagement />
          </TabsContent>

          <TabsContent value="rewards">
            <RewardsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
