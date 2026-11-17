import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bold, 
  Italic, 
  Link, 
  List, 
  Heading1, 
  Heading2, 
  Image, 
  AlignLeft,
  AlignCenter,
  Palette,
  Type,
  Variable
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichEmailEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: string[];
}

const EMAIL_COLORS = [
  { name: "Primary", value: "#3b82f6" },
  { name: "Success", value: "#22c55e" },
  { name: "Warning", value: "#f59e0b" },
  { name: "Danger", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

const FONT_SIZES = [
  { name: "Small", value: "12px" },
  { name: "Normal", value: "14px" },
  { name: "Medium", value: "16px" },
  { name: "Large", value: "18px" },
  { name: "XL", value: "24px" },
];

export const RichEmailEditor = ({ value, onChange, variables = [] }: RichEmailEditorProps) => {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const insertAtCursor = useCallback((before: string, after: string = "") => {
    if (!textareaRef) return;
    
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textareaRef.focus();
      textareaRef.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, [textareaRef, value, onChange]);

  const wrapSelection = useCallback((tag: string, attributes: string = "") => {
    if (!textareaRef) return;
    
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end) || "text";
    
    const openTag = attributes ? `<${tag} ${attributes}>` : `<${tag}>`;
    const closeTag = `</${tag}>`;
    
    insertAtCursor(openTag, closeTag);
  }, [textareaRef, value, insertAtCursor]);

  const insertVariable = useCallback((variable: string) => {
    insertAtCursor(`{{${variable}}}`);
  }, [insertAtCursor]);

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: () => wrapSelection("strong") },
    { icon: Italic, label: "Italic", action: () => wrapSelection("em") },
    { icon: Heading1, label: "Heading 1", action: () => wrapSelection("h1") },
    { icon: Heading2, label: "Heading 2", action: () => wrapSelection("h2") },
    { icon: Link, label: "Link", action: () => insertAtCursor('<a href="URL">', '</a>') },
    { icon: List, label: "List", action: () => insertAtCursor("<ul>\n  <li>", "</li>\n</ul>") },
    { icon: Image, label: "Image", action: () => insertAtCursor('<img src="URL" alt="description" style="max-width:100%">') },
    { icon: AlignLeft, label: "Left Align", action: () => wrapSelection("div", 'style="text-align:left"') },
    { icon: AlignCenter, label: "Center", action: () => wrapSelection("div", 'style="text-align:center"') },
  ];

  const defaultVariables = [
    "customer_name",
    "customer_email",
    "business_name",
    "order_number",
    "order_total",
    "invoice_number",
    "due_date",
    "payment_link",
  ];

  const allVariables = [...new Set([...defaultVariables, ...variables])];

  return (
    <div className="space-y-2">
      <Label>Email Body</Label>
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-t-md border border-b-0">
        {toolbarButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={button.action}
            title={button.label}
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
        
        <div className="w-px h-8 bg-border mx-1" />
        
        {/* Color picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="grid grid-cols-3 gap-2">
              {EMAIL_COLORS.map((color) => (
                <button
                  key={color.name}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground transition-colors"
                  style={{ backgroundColor: color.value }}
                  onClick={() => wrapSelection("span", `style="color:${color.value}"`)}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font size */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Font Size">
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32">
            <div className="space-y-1">
              {FONT_SIZES.map((size) => (
                <Button
                  key={size.name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => wrapSelection("span", `style="font-size:${size.value}"`)}
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Variables */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" title="Insert Variable">
              <Variable className="h-4 w-4" />
              <span className="text-xs">Variables</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {allVariables.map((variable) => (
                  <Button
                    key={variable}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start font-mono text-xs"
                    onClick={() => insertVariable(variable)}
                  >
                    {"{{"}
                    {variable}
                    {"}}"}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor */}
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your email content here. Use HTML for formatting or the toolbar above."
        rows={12}
        className="font-mono text-sm rounded-t-none border-t-0"
      />

      {/* Detected variables */}
      {value && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">Detected variables:</span>
          {[...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {match[1]}
            </Badge>
          ))}
          {![...value.matchAll(/\{\{([^}]+)\}\}/g)].length && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      )}
    </div>
  );
};
