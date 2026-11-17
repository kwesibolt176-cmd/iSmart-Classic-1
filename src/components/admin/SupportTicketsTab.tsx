import { useEffect, useState } from "react";
import { Ticket, MessageSquare, User, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  user_id: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  user_id: string;
  is_internal: boolean;
  created_at: string;
}

export const SupportTicketsTab = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
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

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "resolved" || newStatus === "closed") {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke("send-support-notification", {
          body: {
            ticket_id: ticketId,
            notification_type: "status_change",
            new_status: newStatus,
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      toast({
        title: "Success",
        description: "Ticket status updated",
      });

      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Insert message as NOT internal so user can see it
      const { error } = await supabase.from("support_ticket_messages").insert([{
        ticket_id: selectedTicket.id,
        user_id: currentUser?.user?.id,
        message: newMessage,
        is_internal: false,
      }]);

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke("send-support-notification", {
          body: {
            ticket_id: selectedTicket.id,
            notification_type: "new_reply",
            message: newMessage,
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }

      toast({
        title: "Success",
        description: "Message sent",
      });

      setNewMessage("");
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_progress": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "resolved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "closed": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Support Tickets
          </CardTitle>
          <CardDescription>
            Manage customer support requests and help desk tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No support tickets found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{ticket.category}</TableCell>
                      <TableCell>{format(new Date(ticket.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            fetchMessages(ticket.id);
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className={getPriorityColor(selectedTicket.priority)}>
                  {selectedTicket.priority.toUpperCase()}
                </Badge>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(value) => handleUpdateStatus(selectedTicket.id, value)}
                >
                  <SelectTrigger className="w-[200px]">
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

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedTicket.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Messages</h4>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.is_internal ? "bg-blue-500/10" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Type your response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  Send Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
