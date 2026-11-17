import { useState, useEffect, useRef } from "react";
import { Plus, MessageSquare, Clock, CheckCircle, Send, Ticket, AlertCircle, Paperclip, X, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/PageHeader";
import { LifeBuoy } from "lucide-react";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  created_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  message: string;
  user_id: string;
  is_internal: boolean;
  created_at: string;
  attachments: string[] | null;
}

const Support = () => {
  const { user, profile } = useBusiness();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user?.id]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMsg = payload.new as TicketMessage;
          // Only add if not internal (from super admin to user) or if it's our own message
          if (!newMsg.is_internal || newMsg.user_id === user?.id) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, user?.id]);

  // Real-time subscription for ticket status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          const updated = payload.new as SupportTicket;
          setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
          if (selectedTicket?.id === updated.id) {
            setSelectedTicket(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedTicket?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .eq("is_internal", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(fileName);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert([{
          user_id: user?.id,
          business_id: profile?.id,
          subject: newTicket.subject,
          description: newTicket.description,
          priority: newTicket.priority,
          category: newTicket.category,
          status: "open",
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });

      setNewTicket({ subject: "", description: "", priority: "medium", category: "general" });
      setIsCreateOpen(false);
      fetchTickets();
      
      if (data) {
        setSelectedTicket(data);
        fetchMessages(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && attachments.length === 0)) return;

    setSendingMessage(true);
    setUploading(attachments.length > 0);

    try {
      let uploadedUrls: string[] = [];
      
      if (attachments.length > 0) {
        uploadedUrls = await uploadAttachments();
      }

      const { error } = await supabase.from("support_ticket_messages").insert([{
        ticket_id: selectedTicket.id,
        user_id: user?.id,
        message: newMessage || (uploadedUrls.length > 0 ? "Attached file(s)" : ""),
        is_internal: false,
        attachments: uploadedUrls.length > 0 ? uploadedUrls : null,
      }]);

      if (error) throw error;

      setNewMessage("");
      setAttachments([]);
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Warning",
        description: "Some files were too large (max 10MB)",
        variant: "destructive",
      });
    }
    
    setAttachments(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_progress": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "resolved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      case "resolved": return <CheckCircle className="w-4 h-4" />;
      case "closed": return <CheckCircle className="w-4 h-4" />;
      default: return <Ticket className="w-4 h-4" />;
    }
  };

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('-').slice(1).join('-');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <PageHeader
        title="Support"
        description="Get help from our support team"
        rightContent={<LifeBuoy className="w-6 h-6 text-primary/40" />}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card className="hover:border-primary/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tickets</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="hover:border-blue-500/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.open}</p>
              </div>
            </div>
          </Card>
          <Card className="hover:border-green-500/20 transition-colors shadow-sm">
            <div className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolved</p>
                <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ticket History</h3>
            <p className="text-sm text-muted-foreground">Select a ticket to view conversation</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Submit a new support request and our team will respond as soon as possible.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your issue in detail..."
                    rows={5}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateTicket} disabled={creating} className="w-full">
                  {creating ? "Creating..." : "Submit Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100dvh-250px)] min-h-[500px] lg:h-[650px]">
        {/* Tickets List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Tickets</CardTitle>
            <CardDescription>{tickets.length} ticket(s)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 p-4">
                {tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No support tickets yet</p>
                    <p className="text-sm">Create a ticket to get help</p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchMessages(ticket.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedTicket?.id === ticket.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-sm line-clamp-1">{ticket.subject}</span>
                        <Badge variant="outline" className={`${getStatusColor(ticket.status)} shrink-0 text-xs`}>
                          {getStatusIcon(ticket.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} text-xs`}>
                          {ticket.priority}
                        </Badge>
                        <span className="capitalize">{ticket.category}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.created_at), "MMM d")}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedTicket ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{selectedTicket.category}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {/* Original description */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Original message:</p>
                      <p className="text-sm">{selectedTicket.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(selectedTicket.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>

                    {/* Messages */}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.user_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.user_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 text-xs underline ${
                                    msg.user_id === user?.id ? "text-primary-foreground/80" : "text-muted-foreground"
                                  }`}
                                >
                                  <Download className="w-3 h-3" />
                                  {getFileNameFromUrl(url)}
                                </a>
                              ))}
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            msg.user_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
                  <div className="p-4 border-t space-y-2">
                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, i) => (
                          <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[100px] truncate">{file.name}</span>
                            <button onClick={() => removeAttachment(i)}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sendingMessage || attachments.length >= 5}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sendingMessage}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={(!newMessage.trim() && attachments.length === 0) || sendingMessage}
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {(selectedTicket.status === "closed" || selectedTicket.status === "resolved") && (
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground text-center">
                      This ticket has been {selectedTicket.status}. Create a new ticket if you need further assistance.
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a ticket to view conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  </div>
);
};

export default Support;
