import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Search, Circle, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Conversation {
  id: string;
  business_name: string;
  user_id: string;
  last_message: string;
  last_message_at: string;
  subject: string;
  status: string;
  priority: string;
  description: string;
}

interface Message {
  id: string;
  message: string;
  user_id: string;
  is_internal: boolean;
  created_at: string;
  attachments: string[] | null;
}

export const SupportChatTab = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
  }, []);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`admin-ticket-messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchConversations = async () => {
    setLoading(true);
    
    try {
      // Get support tickets as conversations
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("id, user_id, subject, description, created_at, status, priority, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (tickets) {
        // Get business names
        const userIds = [...new Set(tickets.map(t => t.user_id))];
        const { data: businesses } = await supabase
          .from("business_profiles")
          .select("user_id, business_name")
          .in("user_id", userIds);

        const businessMap = new Map(businesses?.map(b => [b.user_id, b.business_name]) || []);

        const conversationsList: Conversation[] = tickets.map(t => ({
          id: t.id,
          business_name: businessMap.get(t.user_id) || "Unknown Business",
          user_id: t.user_id,
          last_message: t.description.substring(0, 100),
          last_message_at: t.updated_at || t.created_at,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          description: t.description,
        }));

        setConversations(conversationsList);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    
    try {
      // Fetch messages from support_ticket_messages (same table business uses)
      const { data: msgs, error } = await supabase
        .from("support_ticket_messages")
        .select("id, message, user_id, is_internal, created_at, attachments")
        .eq("ticket_id", conv.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(msgs || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    setSending(true);
    try {
      // Insert into support_ticket_messages (same table business uses)
      const { data: newMsg, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: selectedConversation.id,
          user_id: currentUserId,
          message: newMessage.trim(),
          is_internal: false, // Not internal so user can see it
        })
        .select("id, message, user_id, is_internal, created_at, attachments")
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");

      // Update ticket status to in_progress if it was open
      if (selectedConversation.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", selectedConversation.id);
        
        setSelectedConversation({ ...selectedConversation, status: "in_progress" });
        setConversations(prev => prev.map(c => 
          c.id === selectedConversation.id ? { ...c, status: "in_progress" } : c
        ));
      }

      // Send notification email
      try {
        await supabase.functions.invoke("send-support-notification", {
          body: {
            ticket_id: selectedConversation.id,
            notification_type: "new_reply",
            message: newMessage,
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      toast.success("Message sent");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedConversation) return;

    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", selectedConversation.id);

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke("send-support-notification", {
          body: {
            ticket_id: selectedConversation.id,
            notification_type: "status_change",
            new_status: newStatus,
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      setSelectedConversation({ ...selectedConversation, status: newStatus });
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id ? { ...c, status: newStatus } : c
      ));
      
      toast.success("Status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_progress": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "resolved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isAdminMessage = (msg: Message) => {
    return msg.user_id !== selectedConversation?.user_id;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-auto lg:h-[600px]">
      {/* Conversation List */}
      <Card className="lg:col-span-1 h-[400px] lg:h-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Support Chats</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchConversations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filteredConversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No conversations</p>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {conv.business_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate text-sm">{conv.business_name}</p>
                        <Badge variant="outline" className={`${getStatusColor(conv.status)} text-xs shrink-0`}>
                          {conv.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-primary font-medium truncate mt-1">{conv.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`${getPriorityColor(conv.priority)} text-xs`}>
                          {conv.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message_at), "MMM d")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="lg:col-span-2 flex flex-col h-[500px] lg:h-auto">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation.business_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedConversation.business_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedConversation.subject}</p>
                  </div>
                </div>
                <Select value={selectedConversation.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Show ticket description */}
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Original Issue:</p>
                <p className="text-sm">{selectedConversation.description}</p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No messages yet. Send a reply to start the conversation.</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${isAdminMessage(message) ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            isAdminMessage(message)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs underline"
                                >
                                  <Download className="w-3 h-3" />
                                  Attachment {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                          <p className={`text-xs mt-1 ${
                            isAdminMessage(message) ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {format(new Date(message.created_at), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !sending && sendMessage()}
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="gap-2">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};