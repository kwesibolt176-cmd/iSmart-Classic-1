import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Merge, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "@/hooks/use-toast";

interface Duplicate {
  ids: string[];
  reason: string;
  confidence: number;
  customers?: { id: string; name: string; phone: string; email: string }[];
}

export const CustomerDuplicateDetector = ({ onMergeComplete }: { onMergeComplete?: () => void }) => {
  const { user } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [selectedForMerge, setSelectedForMerge] = useState<{ primaryId: string; mergeIds: string[] } | null>(null);

  const scanForDuplicates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-customer-profile", {
        body: { action: "find-duplicates", businessUserId: user.id }
      });

      if (error) throw error;

      // Fetch customer details for each duplicate group
      const enrichedDuplicates = await Promise.all(
        (data.duplicates || []).map(async (dup: Duplicate) => {
          const { data: customers } = await supabase
            .from("customers")
            .select("id, name, phone, email")
            .in("id", dup.ids);
          return { ...dup, customers: customers || [] };
        })
      );

      setDuplicates(enrichedDuplicates);
      
      if (enrichedDuplicates.length === 0) {
        toast({ title: "No duplicates found", description: "Your customer data looks clean!" });
      } else {
        toast({ 
          title: `Found ${enrichedDuplicates.length} potential duplicates`, 
          description: "Review and merge if needed" 
        });
      }
    } catch (error: any) {
      console.error("Error scanning for duplicates:", error);
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedForMerge || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("enhance-customer-profile", {
        body: {
          action: "merge-customers",
          businessUserId: user.id,
          primaryId: selectedForMerge.primaryId,
          mergeIds: selectedForMerge.mergeIds
        }
      });

      if (error) throw error;

      toast({ title: "Customers merged successfully" });
      setDuplicates(prev => prev.filter(d => 
        !d.ids.some(id => selectedForMerge.mergeIds.includes(id))
      ));
      setSelectedForMerge(null);
      onMergeComplete?.();
    } catch (error: any) {
      console.error("Error merging customers:", error);
      toast({ title: "Merge failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Duplicate Detection
        </CardTitle>
        <CardDescription>
          Find and merge duplicate customer profiles using AI-powered matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={scanForDuplicates} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Scan for Duplicates
            </>
          )}
        </Button>

        {duplicates.length > 0 && (
          <div className="space-y-3">
            {duplicates.map((dup, idx) => (
              <Card key={idx} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">{dup.reason}</span>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(dup.confidence * 100)}% match
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {dup.customers?.map((customer) => (
                      <div key={customer.id} className="flex items-center gap-3 p-2 bg-background rounded">
                        <Checkbox
                          checked={selectedForMerge?.primaryId === customer.id}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedForMerge({
                                primaryId: customer.id,
                                mergeIds: dup.ids.filter(id => id !== customer.id)
                              });
                            } else {
                              setSelectedForMerge(null);
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.phone} • {customer.email}
                          </p>
                        </div>
                        {selectedForMerge?.primaryId === customer.id && (
                          <Badge variant="default" className="text-xs">Primary</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedForMerge && dup.ids.includes(selectedForMerge.primaryId) && (
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={handleMerge}
                      disabled={loading}
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Merge into Primary
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
