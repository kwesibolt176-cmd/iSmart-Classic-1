import { icons } from "lucide-react";
import React from "react";

interface DynamicIconProps {
  name?: string | null;
  className?: string;
}

export const DynamicIcon = ({ name, className }: DynamicIconProps) => {
  if (!name) return null;

  // Try to find the icon in the lucide-react icons bundle
  const IconComponent = (icons as any)[name];

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to text (handling old emoji strings from database)
  return <span className={className}>{name}</span>;
};
