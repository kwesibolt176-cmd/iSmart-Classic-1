import { useState, useEffect } from "react";
import { Bell, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  source?: "ismart" | "local";
  // Local DB fields
  user_id?: string;
  recipient_id?: string | null;
  link?: string;
}

export const NotificationsDropdown = () => {
  const { user } = useBusiness();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const unsubscribe = subscribeToNotifications();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const localNotifs = await fetchLocalNotifications();
    const merged = localNotifs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);

    setNotifications(merged);
    setUnreadCount(merged.filter(n => !n.is_read).length);
    setLoading(false);
  };

  const fetchLocalNotifications = async (): Promise<Notification[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to load notifications:", error);
      toast({
        title: "Couldn't load notifications",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return (data || []).map(n => ({ ...n, source: "local" as const }));
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel(`notifications-changes-${user?.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.recipient_id === user?.id || newNotification.user_id === user?.id) {
            setNotifications(prev =>
              prev.some(n => n.source === "local" && n.id === newNotification.id)
                ? prev
                : [{ ...newNotification, source: "local" }, ...prev]
            );
            if (!newNotification.is_read) setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);
    if (error) {
      toast({
        title: "Couldn't mark as read",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNotifications(prev =>
      prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleDelete = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();

    const { error } = await supabase.from("notifications").delete().eq("id", notification.id);
    if (error) {
      toast({
        title: "Couldn't delete notification",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    if (!notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleClearAll = async () => {
    if (user) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`);
      if (error) {
        toast({
          title: "Couldn't clear notifications",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    setNotifications([]);
    setUnreadCount(0);
    toast({ title: "Notifications cleared" });
  };


  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-secondary";
      case "warning": return "bg-accent";
      case "error": return "bg-destructive";
      default: return "bg-primary";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11 rounded-xl hover:bg-primary/10 hover:scale-105 transition-all duration-200 group"
        >
          <div className="relative">
            <Bell className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
            {unreadCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <Badge className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground p-0 text-[10px] font-bold border-2 border-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                </span>
              </>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-2 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Notifications</h4>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {loading ? "Loading..." : "No notifications yet"}
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={`${notification.source}-${notification.id}`}
              onClick={() => handleMarkAsRead(notification)}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                !notification.is_read ? "bg-muted/50" : ""
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`w-2 h-2 rounded-full shrink-0 ${getTypeColor(notification.type)}`} />
                <span className="font-medium text-sm flex-1 truncate">{notification.title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "HH:mm")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(e, notification)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-4 line-clamp-2">{notification.message}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
