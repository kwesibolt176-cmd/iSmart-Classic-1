import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Book, 
  Code, 
  Zap, 
  Key, 
  Globe, 
  ArrowRight, 
  Copy, 
  Check,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Terminal,
  Webhook,
  CreditCard,
  ShoppingCart,
  Users,
  Package,
  FileText,
  MessageSquare,
  Store,
  PartyPopper,
  AlertTriangle
} from "lucide-react";

const Docs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("getting-started");

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navigation = [
    {
      title: "Getting Started",
      items: [
        { id: "getting-started", label: "Introduction", icon: Book },
        { id: "authentication", label: "Authentication", icon: Key },
        { id: "quickstart", label: "Quickstart", icon: Zap },
      ],
    },
    {
      title: "API Reference",
      items: [
        { id: "products", label: "Products", icon: Package },
        { id: "orders", label: "Orders", icon: ShoppingCart },
        { id: "customers", label: "Customers", icon: Users },
        { id: "payments", label: "Payments", icon: CreditCard },
        { id: "invoices", label: "Invoices", icon: FileText },
      ],
    },
    {
      title: "Integrations",
      items: [
        { id: "webhooks", label: "Webhooks", icon: Webhook },
        { id: "storefront", label: "Storefront Embed", icon: Store },
        { id: "pos", label: "POS Integration", icon: Terminal },
      ],
    },
    {
      title: "SDKs",
      items: [
        { id: "sdk-javascript", label: "JavaScript SDK", icon: Code },
        { id: "sdk-python", label: "Python SDK", icon: Code },
        { id: "sdk-php", label: "PHP SDK", icon: Code },
      ],
    },
  ];

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/30">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase">{language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => copyToClipboard(code, id)}
        >
          {copiedCode === id ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-foreground/90">{code}</code>
      </pre>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "getting-started":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Documentation</Badge>
              <h1 className="text-4xl font-bold mb-4">Welcome to Dowo API</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Build powerful integrations with Dowo's comprehensive API. Manage products, process orders, 
                handle payments, and more—all programmatically.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Zap, title: "Quickstart", desc: "Get up and running in 5 minutes", link: "quickstart" },
                { icon: Key, title: "Authentication", desc: "Learn how to authenticate API requests", link: "authentication" },
                { icon: Code, title: "SDKs", desc: "Use our official client libraries", link: "sdk-javascript" },
              ].map((card) => (
                <button
                  key={card.title}
                  onClick={() => setActiveSection(card.link)}
                  className="flex flex-col p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                  <ChevronRight className="h-4 w-4 mt-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <h3 className="font-semibold mb-2">Base URL</h3>
              <CodeBlock 
                code="https://api.getdowo.com/v1" 
                language="endpoint" 
                id="base-url" 
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Core Concepts</h2>
              <div className="grid gap-4">
                {[
                  { title: "RESTful API", desc: "Our API follows REST principles with predictable resource-oriented URLs." },
                  { title: "JSON Format", desc: "All requests and responses use JSON format with UTF-8 encoding." },
                  { title: "Rate Limiting", desc: "API requests are rate limited to 1000 requests per minute per API key." },
                  { title: "Versioning", desc: "API versions are included in the URL path (e.g., /v1/)." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-xl border border-border/50 bg-card/30">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "authentication":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Authentication</Badge>
              <h1 className="text-4xl font-bold mb-4">API Authentication</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Secure your API requests using API keys. All requests must include your API key in the header.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Getting Your API Key</h2>
              <ol className="space-y-3">
                {[
                  "Log in to your Dowo dashboard",
                  "Navigate to Settings → API Keys",
                  "Click 'Create New API Key'",
                  "Copy your secret key (it won't be shown again)",
                ].map((step, index) => (
                  <li key={index} className="flex gap-4 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Using Your API Key</h2>
              <p className="text-muted-foreground">
                Include your API key in the <code className="px-1.5 py-0.5 rounded bg-muted text-sm">Authorization</code> header:
              </p>
              <CodeBlock
                code={`curl -X GET "https://api.getdowo.com/v1/products" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                language="bash"
                id="auth-example"
              />
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
              <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 whitespace-nowrap flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Keep Your Keys Safe</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Never expose API keys in client-side code</li>
                <li>• Don't commit keys to version control</li>
                <li>• Rotate keys regularly for security</li>
                <li>• Use environment variables in production</li>
              </ul>
            </div>
          </div>
        );

      case "quickstart":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Quickstart</Badge>
              <h1 className="text-4xl font-bold mb-4">Get Started in 5 Minutes</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Follow this guide to make your first API request and retrieve your products.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">1</span>
                  Install the SDK
                </h2>
                <Tabs defaultValue="npm" className="w-full">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="npm">npm</TabsTrigger>
                    <TabsTrigger value="yarn">yarn</TabsTrigger>
                    <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                  </TabsList>
                  <TabsContent value="npm" className="mt-4">
                    <CodeBlock code="npm install @dowo/sdk" language="bash" id="install-npm" />
                  </TabsContent>
                  <TabsContent value="yarn" className="mt-4">
                    <CodeBlock code="yarn add @dowo/sdk" language="bash" id="install-yarn" />
                  </TabsContent>
                  <TabsContent value="pnpm" className="mt-4">
                    <CodeBlock code="pnpm add @dowo/sdk" language="bash" id="install-pnpm" />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">2</span>
                  Initialize the Client
                </h2>
                <CodeBlock
                  code={`import { Dowo } from '@dowo/sdk';

const dowo = new Dowo({
  apiKey: process.env.DOWO_API_KEY,
});`}
                  language="javascript"
                  id="init-client"
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">3</span>
                  Make Your First Request
                </h2>
                <CodeBlock
                  code={`// List all products
const products = await dowo.products.list();

console.log(products);
// {
//   data: [
//     { id: 'prod_123', name: 'Classic Jollof Rice', price: 2500 },
//     { id: 'prod_456', name: 'Grilled Chicken', price: 3500 },
//   ],
//   has_more: true
// }`}
                  language="javascript"
                  id="first-request"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
              <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2 whitespace-nowrap flex items-center gap-2"><PartyPopper className="h-5 w-5" /> You're all set!</h3>
              <p className="text-sm text-muted-foreground">
                You've successfully made your first API request. Explore the API reference to discover all available endpoints.
              </p>
            </div>
          </div>
        );

      case "products":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">API Reference</Badge>
              <h1 className="text-4xl font-bold mb-4">Products</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Create, retrieve, update, and delete products in your inventory.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  method: "GET",
                  endpoint: "/v1/products",
                  description: "List all products",
                  color: "bg-green-500",
                },
                {
                  method: "GET",
                  endpoint: "/v1/products/:id",
                  description: "Retrieve a product",
                  color: "bg-green-500",
                },
                {
                  method: "POST",
                  endpoint: "/v1/products",
                  description: "Create a product",
                  color: "bg-blue-500",
                },
                {
                  method: "PATCH",
                  endpoint: "/v1/products/:id",
                  description: "Update a product",
                  color: "bg-amber-500",
                },
                {
                  method: "DELETE",
                  endpoint: "/v1/products/:id",
                  description: "Delete a product",
                  color: "bg-red-500",
                },
              ].map((endpoint) => (
                <div key={endpoint.endpoint} className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-muted/30">
                    <Badge className={`${endpoint.color} text-white font-mono text-xs`}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.endpoint}</code>
                  </div>
                  <div className="p-4">
                    <p className="text-muted-foreground">{endpoint.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Create a Product</h2>
              <CodeBlock
                code={`const product = await dowo.products.create({
  name: 'Jollof Rice',
  description: 'Classic Ghanaian party jollof',
  price: 45,
  currency: 'GHS',
  category_id: 'cat_food',
  track_inventory: true,
  quantity: 100,
});`}
                language="javascript"
                id="create-product"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Product Object</h2>
              <CodeBlock
                code={`{
  "id": "prod_abc123",
  "name": "Jollof Rice",
  "description": "Classic Ghanaian party jollof",
  "price": 45,
  "currency": "GHS",
  "category_id": "cat_food",
  "image_url": "https://storage.dowo.com/...",
  "track_inventory": true,
  "quantity": 100,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}`}
                language="json"
                id="product-object"
              />
            </div>
          </div>
        );

      case "orders":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">API Reference</Badge>
              <h1 className="text-4xl font-bold mb-4">Orders</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Manage orders, update statuses, and process fulfillment.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { method: "GET", endpoint: "/v1/orders", description: "List all orders", color: "bg-green-500" },
                { method: "GET", endpoint: "/v1/orders/:id", description: "Retrieve an order", color: "bg-green-500" },
                { method: "POST", endpoint: "/v1/orders", description: "Create an order", color: "bg-blue-500" },
                { method: "PATCH", endpoint: "/v1/orders/:id", description: "Update an order", color: "bg-amber-500" },
              ].map((endpoint) => (
                <div key={endpoint.endpoint + endpoint.method} className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-muted/30">
                    <Badge className={`${endpoint.color} text-white font-mono text-xs`}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.endpoint}</code>
                  </div>
                  <div className="p-4">
                    <p className="text-muted-foreground">{endpoint.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Create an Order</h2>
              <CodeBlock
                code={`const order = await dowo.orders.create({
  customer_id: 'cust_xyz',
  items: [
    { product_id: 'prod_abc', quantity: 2 },
    { product_id: 'prod_def', quantity: 1 },
  ],
  order_type: 'delivery',
  delivery_address: '123 Independence Avenue, Accra',
});`}
                language="javascript"
                id="create-order"
              />
            </div>
          </div>
        );

      case "webhooks":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Integrations</Badge>
              <h1 className="text-4xl font-bold mb-4">Webhooks</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Receive real-time notifications when events happen in your Dowo account.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Available Events</h2>
              <div className="grid gap-3">
                {[
                  { event: "order.created", desc: "Fired when a new order is placed" },
                  { event: "order.updated", desc: "Fired when an order status changes" },
                  { event: "payment.completed", desc: "Fired when a payment is successful" },
                  { event: "payment.failed", desc: "Fired when a payment fails" },
                  { event: "inventory.low", desc: "Fired when stock falls below threshold" },
                  { event: "customer.created", desc: "Fired when a new customer is added" },
                ].map((item) => (
                  <div key={item.event} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/30">
                    <code className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-mono">{item.event}</code>
                    <span className="text-muted-foreground text-sm">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Webhook Payload</h2>
              <CodeBlock
                code={`{
  "id": "evt_abc123",
  "type": "order.created",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "order_id": "ord_xyz",
    "customer_id": "cust_123",
    "total": 90,
    "currency": "GHS",
    "items": [...]
  }
}`}
                language="json"
                id="webhook-payload"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Verifying Webhooks</h2>
              <CodeBlock
                code={`import { Dowo } from '@dowo/sdk';
import crypto from 'crypto';

const verifyWebhook = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};`}
                language="javascript"
                id="verify-webhook"
              />
            </div>
          </div>
        );

      case "sdk-javascript":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">SDKs</Badge>
              <h1 className="text-4xl font-bold mb-4">JavaScript SDK</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Official JavaScript/TypeScript SDK for Node.js and browser environments.
              </p>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline">npm: @dowo/sdk</Badge>
              <Badge variant="outline">TypeScript</Badge>
              <Badge variant="outline">v1.2.0</Badge>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Installation</h2>
              <CodeBlock code="npm install @dowo/sdk" language="bash" id="js-install" />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Quick Example</h2>
              <CodeBlock
                code={`import { Dowo } from '@dowo/sdk';

const dowo = new Dowo({
  apiKey: process.env.DOWO_API_KEY,
});

// List products
const products = await dowo.products.list({
  limit: 20,
  category: 'food',
});

// Create an order
const order = await dowo.orders.create({
  customer_id: 'cust_123',
  items: [
    { product_id: 'prod_abc', quantity: 2 },
  ],
});

// Process payment
const payment = await dowo.payments.create({
  order_id: order.id,
  amount: order.total,
  method: 'card',
});`}
                language="javascript"
                id="js-example"
              />
            </div>

            <div className="rounded-2xl border border-border/50 p-6">
              <h3 className="font-semibold mb-4">Resources</h3>
              <div className="flex flex-wrap gap-3">
                <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  GitHub Repository
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  npm Package
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  API Reference
                </a>
              </div>
            </div>
          </div>
        );

      case "sdk-python":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">SDKs</Badge>
              <h1 className="text-4xl font-bold mb-4">Python SDK</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Official Python SDK for server-side integrations.
              </p>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline">pip: dowo</Badge>
              <Badge variant="outline">Python 3.8+</Badge>
              <Badge variant="outline">v1.0.0</Badge>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Installation</h2>
              <CodeBlock code="pip install dowo" language="bash" id="py-install" />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Quick Example</h2>
              <CodeBlock
                code={`from dowo import Dowo
import os

dowo = Dowo(api_key=os.environ.get("DOWO_API_KEY"))

# List products
products = dowo.products.list(limit=20)

# Create an order
order = dowo.orders.create(
    customer_id="cust_123",
    items=[
        {"product_id": "prod_abc", "quantity": 2},
    ],
)

# Process payment
payment = dowo.payments.create(
    order_id=order.id,
    amount=order.total,
    method="card",
)`}
                language="python"
                id="py-example"
              />
            </div>
          </div>
        );

      case "sdk-php":
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">SDKs</Badge>
              <h1 className="text-4xl font-bold mb-4">PHP SDK</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Official PHP SDK for Laravel, WordPress, and custom PHP applications.
              </p>
            </div>

            <div className="flex gap-3">
              <Badge variant="outline">composer: dowo/sdk</Badge>
              <Badge variant="outline">PHP 8.0+</Badge>
              <Badge variant="outline">v1.0.0</Badge>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Installation</h2>
              <CodeBlock code="composer require dowo/sdk" language="bash" id="php-install" />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Quick Example</h2>
              <CodeBlock
                code={`<?php

use Dowo\\Dowo;

$dowo = new Dowo(getenv('DOWO_API_KEY'));

// List products
$products = $dowo->products->list(['limit' => 20]);

// Create an order
$order = $dowo->orders->create([
    'customer_id' => 'cust_123',
    'items' => [
        ['product_id' => 'prod_abc', 'quantity' => 2],
    ],
]);

// Process payment
$payment = $dowo->payments->create([
    'order_id' => $order->id,
    'amount' => $order->total,
    'method' => 'card',
]);`}
                language="php"
                id="php-example"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
              <h1 className="text-4xl font-bold mb-4">{activeSection.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
              <p className="text-lg text-muted-foreground">
                This documentation section is currently being written. Check back soon!
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Store className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">Dowo</span>
                <Badge variant="secondary" className="hidden sm:flex">Docs</Badge>
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => setActiveSection("getting-started")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Guides
                </button>
                <button 
                  onClick={() => setActiveSection("products")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  API Reference
                </button>
                <button 
                  onClick={() => setActiveSection("sdk-javascript")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  SDKs
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 h-9 bg-muted/50 border-border/50"
                />
              </div>
              <Link to="/auth">
                <Button size="sm">Get API Key</Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex">
          {/* Sidebar */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-background border-r border-border/50 pt-16 transform transition-transform duration-300
            md:relative md:translate-x-0 md:pt-0 md:block
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="sticky top-20 p-6 space-y-8 max-h-[calc(100vh-5rem)] overflow-y-auto">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            setActiveSection(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                            ${activeSection === item.id 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                          `}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 py-10 md:pl-8 min-w-0">
            <div className="max-w-3xl">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Docs;