'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productsService } from '@/services/products.service';
import { handleApiError } from '@/lib/api';
import { Category, Brand } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { costPrice: 0, sellingPrice: 0 },
  });

  useEffect(() => {
    productsService.listCategories().then((r) => setCategories((r.data as any)?.data ?? r.data ?? []));
    productsService.listBrands().then((r) => setBrands((r.data as any)?.data ?? r.data ?? []));
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await productsService.create(data);
      toast.success('Product created successfully');
      router.push('/products');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="New Product" description="Add a new product to your catalog" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" {...register('name')} placeholder="e.g. Blue T-Shirt" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" {...register('sku')} placeholder="e.g. BLUE-TS-001" />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(v) => setValue('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select onValueChange={(v) => setValue('brandId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input id="costPrice" type="number" step="0.01" {...register('costPrice')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <Input id="sellingPrice" type="number" step="0.01" {...register('sellingPrice')} />
                {errors.sellingPrice && <p className="text-sm text-destructive">{errors.sellingPrice.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" step="0.01" {...register('taxRate')} placeholder="0" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={loading}>Create Product</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
