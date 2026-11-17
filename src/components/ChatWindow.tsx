import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Contact, Message } from "@/pages/Chat";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage?: (text: string) => void;
}

export const ChatWindow = ({ contact, messages, onSendMessage }: ChatWindowProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim() && onSendMessage) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
          <div>
            <h3 className="font-semibold text-foreground">{contact.name}</h3>
            <p className="text-sm text-muted-foreground">{contact.role}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.senderId === "me";
            return (
              <div
                key={message.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" disabled={!inputMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
