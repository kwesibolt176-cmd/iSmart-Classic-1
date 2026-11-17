import { Plus, Send, ArrowDownLeft, Smartphone } from "lucide-react";

interface QuickActionsProps {
  onSectionChange?: (section: string) => void;
  onTopUpWallet?: () => void;
  onSendMoney?: () => void;
  onPaymentLink?: () => void;
  onBuyAirtime?: () => void;
}

export function QuickActions({ 
  onSectionChange, 
  onTopUpWallet, 
  onSendMoney, 
  onPaymentLink, 
  onBuyAirtime 
}: QuickActionsProps) {
  const actions = [
    {
      label: "Add money",
      icon: Plus,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
      onClick: () => onTopUpWallet ? onTopUpWallet() : onSectionChange?.("wallet"),
    },
    {
      label: "Send money",
      icon: Send,
      image: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=80", // Money transfer/sending
      onClick: () => onSendMoney ? onSendMoney() : onSectionChange?.("disbursements"),
    },
    {
      label: "Payment link",
      icon: ArrowDownLeft,
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80", // Credit card/payment
      onClick: () => onPaymentLink ? onPaymentLink() : onSectionChange?.("collections"),
    },
    {
      label: "Buy airtime",
      icon: Smartphone,
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80", // Smartphone/mobile phone
      onClick: () => onBuyAirtime ? onBuyAirtime() : onSectionChange?.("utilities"),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="group relative h-36 rounded-xl overflow-hidden transition-all hover:scale-[1.02] shadow-sm hover:shadow-md border border-border/50"
        >
          {/* Background Image - Let it shine through */}
          <img 
            src={action.image} 
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
            loading="lazy"
          />
          
          {/* Minimal overlay - just for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-start justify-between p-4 text-white">
            <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
              <action.icon className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold drop-shadow-lg">
              {action.label}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
