import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GiftCardsList } from "@/components/GiftCardsList";
import { GiftCardTransactions } from "@/components/GiftCardTransactions";
import { Gift } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export const GiftCards = () => {
  const [activeTab, setActiveTab] = useState("cards");

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Gift Cards"
        description="Create and manage gift cards"
        rightContent={<Gift className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="cards">Gift Cards</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            <GiftCardsList />
          </TabsContent>

          <TabsContent value="transactions">
            <GiftCardTransactions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
