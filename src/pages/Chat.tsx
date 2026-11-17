import { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export interface Contact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: "online" | "offline" | "away";
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export const Chat = () => {
  const { user } = useBusiness();
  const isMobile = useIsMobile();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStaffContacts();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedContact && user) {
      fetchMessages(selectedContact.id);
      const cleanup = subscribeToMessages(selectedContact.id);
      return cleanup;
    }
  }, [selectedContact, user]);

  // Generate a deterministic UUID from two IDs
  const getConversationId = (userId: string, staffId: string): string => {
    const sorted = [userId, staffId].sort();
    const combined = sorted.join("");
    
    // Create a simple hash
    let hash1 = 0, hash2 = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash1 = ((hash1 << 5) - hash1 + char) | 0;
      hash2 = ((hash2 << 7) + char) | 0;
    }
    
    // Format as valid UUID v4
    const hex1 = Math.abs(hash1).toString(16).padStart(8, '0').slice(0, 8);
    const hex2 = Math.abs(hash2).toString(16).padStart(8, '0').slice(0, 8);
    return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-a${hex1.slice(1, 4)}-${hex1}${hex2.slice(0, 4)}`;
  };

  const fetchStaffContacts = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (data) {
      const contactsWithUnread = await Promise.all(
        data.map(async (s) => {
          const conversationId = getConversationId(user.id, s.id);
          
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id)
            .eq("is_read", false);

          // Get last message
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("message, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: s.id,
            name: s.name,
            role: s.position || "Staff",
            status: "online" as const,
            lastMessage: lastMsg?.message,
            lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            unread: count || 0,
          };
        })
      );

      setContacts(contactsWithUnread);
      if (contactsWithUnread.length > 0 && !selectedContact) {
        setSelectedContact(contactsWithUnread[0]);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (contactId: string) => {
    if (!user) return;
    
    const conversationId = getConversationId(user.id, contactId);
    
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        id: m.id,
        senderId: m.sender_id === user.id ? "me" : contactId,
        text: m.message,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: m.is_read,
      })));

      // Mark messages as read
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      // Update unread count in contacts
      setContacts(prev => prev.map(c => 
        c.id === contactId ? { ...c, unread: 0 } : c
      ));
    }
  };

  const subscribeToMessages = (contactId: string) => {
    const conversationId = getConversationId(user!.id, contactId);
    
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              senderId: newMsg.sender_id === user?.id ? "me" : contactId,
              text: newMsg.message,
              timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: newMsg.is_read,
            }];
          });

          // Mark as read if we're the recipient and viewing this chat
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !selectedContact) return;

    const conversationId = getConversationId(user.id, selectedContact.id);

    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      recipient_id: selectedContact.id,
      message: text,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleBackToContacts = () => {
    setSelectedContact(null);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* On mobile: show either sidebar or chat window */}
      {isMobile ? (
        <>
          {!selectedContact ? (
            <ChatSidebar
              contacts={contacts}
              selectedContact={selectedContact}
              onSelectContact={handleSelectContact}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-3 border-b border-border bg-card">
                <Button variant="ghost" size="sm" onClick={handleBackToContacts} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
              <ChatWindow 
                contact={selectedContact} 
                messages={messages} 
                onSendMessage={handleSendMessage}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <ChatSidebar
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
          />
          {selectedContact ? (
            <ChatWindow 
              contact={selectedContact} 
              messages={messages} 
              onSendMessage={handleSendMessage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <p className="text-muted-foreground">Select a contact to start chatting</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
