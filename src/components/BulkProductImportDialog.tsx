import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import Papa from "papaparse";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CSVRow {
  name?: string;
  price?: string;
  quantity?: string;
  cost?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  low_stock_threshold?: string;
  description?: string;
}

// Accept common header spellings so real-world spreadsheets import cleanly
const HEADER_ALIASES: Record<string, keyof CSVRow> = {
  name: "name",
  product: "name",
  "product name": "name",
  title: "name",
  item: "name",
  price: "price",
  "selling price": "price",
  "unit price": "price",
  amount: "price",
  quantity: "quantity",
  qty: "quantity",
  stock: "quantity",
  "stock quantity": "quantity",
  cost: "cost",
  "cost price": "cost",
  "buying price": "cost",
  sku: "sku",
  code: "sku",
  barcode: "barcode",
  ean: "barcode",
  category: "category",
  subcategory: "subcategory",
  "sub category": "subcategory",
  low_stock_threshold: "low_stock_threshold",
  "low stock threshold": "low_stock_threshold",
  reorder_level: "low_stock_threshold",
  "reorder level": "low_stock_threshold",
  description: "description",
  details: "description",
};

const normalizeHeader = (h: string) => {
  const key = h.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_");
};

// Strip currency symbols, thousands separators and stray spaces: "GHS 1,200.50" -> 1200.5
const parseNumber = (value?: string): number | null => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const parseCsv = (file: File) =>
  new Promise<CSVRow[]>((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: (results) =>
        resolve(
          (results.data as CSVRow[]).filter(
            (r) => r && Object.values(r).some((v) => String(v ?? "").trim() !== "")
          )
        ),
      error: (err) => reject(err),
    });
  });

export const BulkProductImportDialog = ({
  open,
  onOpenChange,
  onImportComplete,
}: BulkProductImportDialogProps) => {
  const { toast } = useToast();
  const { currentLocation } = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  const downloadTemplate = () => {
    const template = `name,price,quantity,cost,sku,barcode,category,subcategory,low_stock_threshold,description
Product Name,10.00,50,5.00,SKU123,BAR123,Electronics,Phones,10,Sample description
Another Product,25.50,100,12.00,SKU456,BAR456,Clothing,Shirts,15,`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setErrors([]);
    setRowErrors([]);
    setPreview([]);
    setProgress(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after a fix
    if (!selectedFile) return;

    const lower = selectedFile.name.toLowerCase();

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      toast({
        title: "Excel files not supported",
        description: "Please save the sheet as CSV (File → Save As → CSV) and upload again.",
        variant: "destructive",
      });
      return;
    }

    if (!lower.endsWith(".csv") && !lower.endsWith(".txt")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .csv file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    resetState();

    try {
      const data = await parseCsv(selectedFile);
      setPreview(data.slice(0, 5));

      const validationErrors: string[] = [];
      const seenBarcodes = new Set<string>();

      if (data.length === 0) {
        validationErrors.push("The file has no data rows.");
      }

      if (data.length > 0 && !("name" in data[0])) {
        validationErrors.push('Missing a "name" column. Download the template to see the expected headers.');
      }

      data.forEach((row, index) => {
        const line = index + 2;
        const name = row.name?.trim();
        const price = parseNumber(row.price);
        const quantity = parseNumber(row.quantity);

        if (!name) validationErrors.push(`Row ${line}: Name is required`);
        if (row.price !== undefined && String(row.price).trim() !== "" && price === null) {
          validationErrors.push(`Row ${line}: Invalid price "${row.price}"`);
        }
        if (row.quantity !== undefined && String(row.quantity).trim() !== "" && quantity === null) {
          validationErrors.push(`Row ${line}: Invalid quantity "${row.quantity}"`);
        }

        const barcode = row.barcode?.trim();
        if (barcode) {
          if (seenBarcodes.has(barcode)) {
            validationErrors.push(`Row ${line}: Duplicate barcode "${barcode}" in this file`);
          }
          seenBarcodes.add(barcode);
        }
      });

      setErrors(validationErrors);
    } catch (error: any) {
      toast({
        title: "Parse error",
        description: error?.message || "Could not read the CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setRowErrors([]);
    setProgress("Reading file…");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parsed = await parseCsv(file);

      const [{ data: existingCategories }, { data: existingSubcategories }] = await Promise.all([
        supabase.from("categories").select("id, name").eq("user_id", user.id),
        supabase.from("subcategories").select("id, name, category_id").eq("user_id", user.id),
      ]);

      const categoryMap = new Map<string, string>(
        (existingCategories || []).map((c) => [c.name.trim().toLowerCase(), c.id])
      );
      const subcategoryMap = new Map<string, string>(
        (existingSubcategories || []).map((s) => [s.name.trim().toLowerCase(), s.id])
      );

      // Auto-create categories/subcategories referenced in the file
      const newCategories = [
        ...new Set(
          parsed
            .map((r) => r.category?.trim())
            .filter((c): c is string => !!c && !categoryMap.has(c.toLowerCase()))
            .map((c) => c.toLowerCase())
        ),
      ];

      if (newCategories.length > 0) {
        setProgress("Creating categories…");
        const original = new Map(
          parsed
            .map((r) => r.category?.trim())
            .filter((c): c is string => !!c)
            .map((c) => [c.toLowerCase(), c])
        );
        const { data: created, error: catError } = await supabase
          .from("categories")
          .insert(newCategories.map((key) => ({ user_id: user.id, name: original.get(key) || key })))
          .select("id, name");
        if (catError) throw new Error(`Could not create categories: ${catError.message}`);
        (created || []).forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c.id));
      }

      const subToCreate: { name: string; categoryId: string | null }[] = [];
      const seenSub = new Set<string>();
      parsed.forEach((r) => {
        const sub = r.subcategory?.trim();
        if (!sub) return;
        const key = sub.toLowerCase();
        if (subcategoryMap.has(key) || seenSub.has(key)) return;
        seenSub.add(key);
        subToCreate.push({ name: sub, categoryId: categoryMap.get(r.category?.trim().toLowerCase() || "") || null });
      });

      const creatableSubs = subToCreate.filter((s) => s.categoryId);
      if (creatableSubs.length > 0) {
        setProgress("Creating subcategories…");
        const { data: created, error: subError } = await supabase
          .from("subcategories")
          .insert(creatableSubs.map((s) => ({ user_id: user.id, name: s.name, category_id: s.categoryId! })))
          .select("id, name");
        if (subError) throw new Error(`Could not create subcategories: ${subError.message}`);
        (created || []).forEach((s) => subcategoryMap.set(s.name.trim().toLowerCase(), s.id));
      }

      const skippedRows: string[] = [];
      const usedBarcodes = new Set<string>();

      // Barcodes are unique across the whole platform, so anything already stored
      // must not be sent again — import the product without the barcode instead.
      const fileBarcodes = [
        ...new Set(parsed.map((r) => r.barcode?.trim()).filter((b): b is string => !!b)),
      ];
      const takenBarcodes = new Set<string>();
      for (let i = 0; i < fileBarcodes.length; i += 200) {
        const slice = fileBarcodes.slice(i, i + 200);
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("barcode")
          .eq("user_id", user.id)
          .in("barcode", slice);
        (existing || []).forEach((e) => e.barcode && takenBarcodes.add(e.barcode));
      }

      const products = parsed
        .map((row, index) => {
          const line = index + 2;
          const name = row.name?.trim();
          if (!name) {
            skippedRows.push(`Row ${line}: skipped — name is empty`);
            return null;
          }

          const price = parseNumber(row.price) ?? 0;
          const quantity = parseNumber(row.quantity) ?? 0;
          const cost = parseNumber(row.cost);
          const threshold = parseNumber(row.low_stock_threshold);

          let barcode = row.barcode?.trim() || null;
          if (barcode && usedBarcodes.has(barcode)) {
            skippedRows.push(`Row ${line}: duplicate barcode "${barcode}" in file — imported without barcode`);
            barcode = null;
          } else if (barcode && takenBarcodes.has(barcode)) {
            skippedRows.push(`Row ${line}: barcode "${barcode}" already exists — imported without barcode`);
            barcode = null;
          }
          if (barcode) usedBarcodes.add(barcode);

          return {
            __line: line,
            user_id: user.id,
            location_id: currentLocation?.id || null,
            name,
            price,
            quantity: Math.max(0, Math.floor(quantity)),
            cost: cost !== null ? cost : null,
            sku: row.sku?.trim() || null,
            barcode,
            description: row.description?.trim() || null,
            category_id: categoryMap.get(row.category?.trim().toLowerCase() || "") || null,
            subcategory_id: subcategoryMap.get(row.subcategory?.trim().toLowerCase() || "") || null,
            low_stock_threshold: threshold !== null ? Math.max(0, Math.floor(threshold)) : 10,
            is_active: true,
            bnpl_enabled: false,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (products.length === 0) {
        throw new Error("No valid products found in the file");
      }

      const CHUNK = 100;
      let inserted = 0;
      const failures: string[] = [...skippedRows];
      const isDuplicate = (msg: string) => /duplicate key|already exists|unique constraint/i.test(msg);

      for (let i = 0; i < products.length; i += CHUNK) {
        const batch = products.slice(i, i + CHUNK);
        setProgress(`Importing ${i + 1}–${Math.min(i + CHUNK, products.length)} of ${products.length}…`);

        const payload = batch.map(({ __line, ...rest }) => rest);
        const { error } = await supabase.from("inventory_items").insert(payload);

        if (!error) {
          inserted += batch.length;
          continue;
        }

        // A single bad row kills the whole batch — retry one by one so good rows land
        for (const item of batch) {
          const { __line, ...rest } = item;
          const { error: rowError } = await supabase.from("inventory_items").insert(rest);
          if (!rowError) {
            inserted += 1;
            continue;
          }

          // Duplicates should never block an import: drop the clashing barcode
          // (or force a unique slug) and try the row once more.
          if (isDuplicate(rowError.message)) {
            const retry = { ...rest } as typeof rest & { slug?: string };
            let note = "";
            if (rest.barcode) {
              retry.barcode = null;
              note = `barcode "${rest.barcode}" already in use — imported without barcode`;
            } else {
              retry.slug = `${rest.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}-${Date.now().toString(36)}-${__line}`;
              note = "duplicate product name — imported with a unique link";
            }

            const { error: retryError } = await supabase.from("inventory_items").insert(retry);
            if (!retryError) {
              inserted += 1;
              failures.push(`Row ${__line} (${rest.name}): ${note}`);
              continue;
            }
            failures.push(`Row ${__line} (${rest.name}): ${retryError.message}`);
            continue;
          }

          failures.push(`Row ${__line} (${rest.name}): ${rowError.message}`);
        }
      }


      setRowErrors(failures);

      if (inserted === 0) {
        throw new Error(failures[0] || "No products could be imported");
      }

      toast({
        title: failures.length > 0 ? "Import completed with issues" : "Import successful",
        description: `Imported ${inserted} product${inserted === 1 ? "" : "s"}${
          failures.length > 0 ? ` — ${failures.length} row(s) had problems` : ""
        }`,
        variant: failures.length > 0 ? "default" : undefined,
      });

      onImportComplete();

      if (failures.length === 0) {
        onOpenChange(false);
        setFile(null);
        resetState();
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error?.message || "Something went wrong during import",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple products at once
            {currentLocation ? ` into ${currentLocation.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Only <span className="font-medium">name</span> is required. Missing price or quantity default to 0.
            </p>
          </div>

          {progress && (
            <Alert>
              <AlertDescription className="text-sm">{progress}</AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Validation Errors:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li>...and {errors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {rowErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Rows that need attention:</div>
                <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-y-auto">
                  {rowErrors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {rowErrors.length > 10 && <li>...and {rowErrors.length - 10} more</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && errors.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Preview (first 5 rows):</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Price</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{parseNumber(row.price) ?? 0}</td>
                          <td className="p-2">{parseNumber(row.quantity) ?? 0}</td>
                          <td className="p-2">{row.category || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || loading || errors.length > 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Importing..." : "Import Products"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
