import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Contact } from "@/pages/Chat";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChatSidebarProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
}

export const ChatSidebar = ({ contacts, selectedContact, onSelectContact }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full sm:w-64 md:w-80 bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={cn(
              "w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border",
              selectedContact?.id === contact.id && "bg-muted"
            )}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {contact.name.charAt(0)}
                </span>
              </div>
              <div
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                  contact.status === "online" && "bg-emerald-500",
                  contact.status === "away" && "bg-amber-500",
                  contact.status === "offline" && "bg-muted-foreground"
                )}
              />
            </div>

            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground truncate">{contact.name}</h3>
                {contact.lastMessageTime && (
                  <span className="text-xs text-muted-foreground">{contact.lastMessageTime}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{contact.role}</p>
              {contact.lastMessage && (
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
              )}
            </div>

            {contact.unread && contact.unread > 0 && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">{contact.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
