'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Barcode, Edit } from 'lucide-react';
import { Product } from '@/types';
import { productsService } from '@/services/products.service';
import { barcodesService } from '@/services/barcodes.service';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { handleApiError } from '@/lib/api';
import { BarcodePreview } from '@/components/barcode/barcode-preview';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  useEffect(() => {
    productsService.get(id)
      .then((r) => setProduct((r.data as any)?.data ?? r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const generateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      await barcodesService.generate(id);
      toast.success('Barcode generated');
      const r = await productsService.get(id);
      setProduct((r.data as any)?.data ?? r.data);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setGeneratingBarcode(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!product) return <div className="text-center py-12">Product not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={product.name}
          description={`SKU: ${product.sku}`}
          action={<StatusBadge status={product.isActive ? 'active' : 'inactive'} />}
        />
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="barcodes">Barcodes</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Category</p><p className="font-medium">{product.category?.name ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Brand</p><p className="font-medium">{product.brand?.name ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Cost Price</p><p className="font-medium">{formatCurrency(product.costPrice)}</p></div>
              <div><p className="text-muted-foreground">Selling Price</p><p className="font-medium">{formatCurrency(product.sellingPrice)}</p></div>
              <div><p className="text-muted-foreground">Tax Rate</p><p className="font-medium">{product.taxRate ?? 0}%</p></div>
              <div><p className="text-muted-foreground">Track Inventory</p><p className="font-medium">{product.trackInventory ? 'Yes' : 'No'}</p></div>
              {product.description && (
                <div className="col-span-2"><p className="text-muted-foreground">Description</p><p>{product.description}</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Variants</CardTitle>
            </CardHeader>
            <CardContent>
              {product.variants?.length ? (
                <div className="space-y-2">
                  {product.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{v.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.sellingPrice && <span className="text-sm">{formatCurrency(v.sellingPrice)}</span>}
                        <StatusBadge status={v.isActive ? 'active' : 'inactive'} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No variants defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Barcodes</CardTitle>
              <Button size="sm" onClick={generateBarcode} isLoading={generatingBarcode}>
                <Barcode className="h-4 w-4 mr-2" />Generate Barcode
              </Button>
            </CardHeader>
            <CardContent>
              {product.barcodes?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {product.barcodes.map((b) => (
                    <div key={b.id} className="border rounded-md p-3 text-center space-y-2">
                      <BarcodePreview value={b.barcodeValue} format={b.barcodeFormat} />
                      <p className="text-xs font-mono">{b.barcodeValue}</p>
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className="text-xs">{b.barcodeFormat}</Badge>
                        {b.isPrimary && <Badge className="text-xs">Primary</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No barcodes assigned. Generate one to get started.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
