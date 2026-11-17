import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Notification {
  id: string;
  action_type: string;
  created_at: string;
  status: string;
}

export const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time updates for pending actions
    const channel = supabase
      .channel("pending-actions-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pending_actions",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("pending_actions")
      .select("id, action_type, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.length);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount} pending action{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No pending notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="px-4 py-3 cursor-pointer">
                <div className="flex flex-col gap-1 w-full">
                  <p className="text-sm font-medium">
                    New {notification.action_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
