
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Package, Plus, RefreshCw, Search } from 'lucide-react'

const API_URL = 'http://localhost:5000/api'

type StoreProduct = {
  id: string
  costPrice: string
  retailPrice: string
  wholesalePrice: string | null
  stockQuantity: string
  lowStockThreshold: string
}

type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  brand: string | null
  imageUrl: string | null
  category: string | null
  description: string | null
  unit: string
  storeProducts: StoreProduct[]
}

type ProductsResponse = {
  success: boolean
  message?: string
  products?: Product[]
  product?: Product
}

type BarcodeLookupResponse = {
  success: boolean
  message?: string
  source?: 'local' | 'open_food_facts' | 'not_found'
  alreadyExists?: boolean
  assignedToStore?: boolean
  product?: {
    id?: string
    barcode: string
    name: string
    brand?: string | null
    imageUrl?: string | null
    category?: string | null
    sku?: string | null
    description?: string | null
    unit?: string
    storeProducts?: StoreProduct[]
  }
}

type CatalogProduct = {
  barcode: string
  name: string
  brand: string
  category: string
  imageUrl: string
}

type CatalogSearchResponse = {
  success: boolean
  message?: string
  products?: CatalogProduct[]
}

type ProductForm = {
  name: string
  barcode: string
  brand: string
  imageUrl: string
  category: string
  description: string
  unit: string
  costPrice: string
  retailPrice: string
  wholesalePrice: string
  stockQuantity: string
  lowStockThreshold: string
}

const initialForm: ProductForm = {
  name: '',
  barcode: '',
  brand: '',
  imageUrl: '',
  category: '',
  description: '',
  unit: 'piece',
  costPrice: '0',
  retailPrice: '0',
  wholesalePrice: '',
  stockQuantity: '0',
  lowStockThreshold: '0',
}

const money = (value: string | number | null) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

type ProductsProps = {
  storeId: string | null
  canManageProducts: boolean
}

export default function Products({
  storeId,
  canManageProducts,
}: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductForm>(initialForm)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
const [productSearchLoading, setProductSearchLoading] = useState(false)
const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([])

  const loadProducts = useCallback(async () => {
    if (!storeId) {
      setProducts([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/stores/${encodeURIComponent(storeId)}/products`,
        { credentials: 'include' },
      )

      const data: ProductsResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load products.')
      }

      setProducts(data.products ?? [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load products.',
      )
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  function updateField(
    field: keyof ProductForm,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  
async function lookupBarcode() {
  const barcode = form.barcode.trim()

  if (!storeId) {
    setError('Pumili muna ng isang store.')
    return
  }

  if (!/^\d{8,14}$/.test(barcode)) {
    setError('Maglagay ng valid barcode na 8 hanggang 14 digits.')
    return
  }

  setLookupLoading(true)
  setError('')
  setSuccess('')

  try {
    const response = await fetch(
      `${API_URL}/stores/${encodeURIComponent(storeId)}/products/barcode/${encodeURIComponent(barcode)}`,
      { credentials: 'include' },
    )

    const data: BarcodeLookupResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Hindi mahanap ang produkto.')
    }

    if (data.alreadyExists && data.product) {
      setSuccess(
        data.assignedToStore
          ? `Nasa store na ito ang ${data.product.name}. Hindi na kailangang idagdag ulit.`
          : `${data.product.name} ay nasa company database na, pero hindi pa naka-link sa store na ito. Kailangan ng product-linking feature.`,
      )
      return
    }

    const product = data.product

    if (!product || !product.name) {
      setSuccess(
        'Hindi nakita sa catalog ang barcode. Maaari mong ilagay nang mano-mano ang product details.',
      )
      return
    }

    setForm((current) => ({
      ...current,
      barcode: product.barcode || barcode,
      name: product.name,
      brand: product.brand || '',
      imageUrl: product.imageUrl || '',
      category: product.category || '',
    }))

    setSuccess(
      'Nakuha ang product details. I-check muna ang impormasyon bago i-save.',
    )
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Nagkaroon ng problema sa barcode lookup.',
    )
  } finally {
    setLookupLoading(false)
  }
}

async function searchProductName() {
  const query = productSearch.trim()

  if (!storeId) {
    setError('Pumili muna ng isang store.')
    return
  }

  if (query.length < 2) {
    setError('Mag-type ng product name na hindi bababa sa 2 characters.')
    return
  }

  setProductSearchLoading(true)
  setError('')
  setSuccess('')
  setCatalogResults([])

  try {
    const response = await fetch(
      `${API_URL}/stores/${encodeURIComponent(storeId)}/products/search?q=${encodeURIComponent(query)}`,
      { credentials: 'include' },
    )

    const data: CatalogSearchResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Hindi makapaghanap sa online catalog.')
    }

    setCatalogResults(data.products ?? [])

    if (!data.products?.length) {
      setSuccess(
        'Walang nahanap sa online catalog. Maaari mong ilagay nang mano-mano ang produkto.',
      )
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Nagkaroon ng problema sa product search.',
    )
  } finally {
    setProductSearchLoading(false)
  }
}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!storeId) {
      setError('Pumili muna ng isang store.')
      return
    }

    if (!form.name.trim()) {
      setError('Ilagay ang product name.')
      return
    }

    const numericFields = [
      ['Cost price', form.costPrice],
      ['Retail price', form.retailPrice],
      ['Stock quantity', form.stockQuantity],
      ['Low-stock threshold', form.lowStockThreshold],
    ] as const

    for (const [label, value] of numericFields) {
      const number = Number(value)
      if (value.trim() === '' || !Number.isFinite(number) || number < 0) {
        setError(`${label} must be zero or greater.`)
        return
      }
    }

    if (
      form.wholesalePrice.trim() !== '' &&
      (!Number.isFinite(Number(form.wholesalePrice)) ||
        Number(form.wholesalePrice) < 0)
    ) {
      setError('Wholesale price must be zero or greater.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || null,
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        description: form.description.trim() || null,
        unit: form.unit.trim() || 'piece',
        costPrice: Number(form.costPrice),
        retailPrice: Number(form.retailPrice),
        wholesalePrice:
          form.wholesalePrice.trim() === ''
            ? null
            : Number(form.wholesalePrice),
        stockQuantity: Number(form.stockQuantity),
        lowStockThreshold: Number(form.lowStockThreshold),
      }

      const response = await fetch(
        `${API_URL}/stores/${encodeURIComponent(storeId)}/products`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const data: ProductsResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save product.')
      }

      setForm(initialForm)
      setShowForm(false)
      setSuccess('Product added successfully.')
      await loadProducts()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save product.',
      )
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase()

    return (
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.sku ?? '').toLowerCase().includes(query) ||
      (product.barcode ?? '').toLowerCase().includes(query) ||
      (product.category ?? '').toLowerCase().includes(query)
    )
  })

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage product details, prices, and store stock.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={!storeId || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {canManageProducts && (
            <button
              type="button"
              disabled={!storeId}
              onClick={() => {
                setError('')
                setSuccess('')
                setShowForm((current) => !current)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              Add Product
            </button>
          )}
        </div>
      </div>

      {!storeId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Pumili muna ng isang store sa store selector bago tingnan o
          magdagdag ng produkto.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {showForm && canManageProducts && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h3 className="mb-5 text-lg font-bold text-slate-900">
            Add New Product
          </h3>

          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
  <label className="mb-2 block text-sm font-semibold text-slate-800">
    Search Online Product Catalog
  </label>

  <div className="flex flex-col gap-2 sm:flex-row">
    <input
      className={`${inputClass} flex-1`}
      value={productSearch}
      onChange={(e) => setProductSearch(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void searchProductName()
        }
      }}
      placeholder="Search product name, e.g. Milo"
      maxLength={100}
    />

    <button
      type="button"
      onClick={() => void searchProductName()}
      disabled={productSearchLoading || !storeId}
      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {productSearchLoading ? 'Searching...' : 'Search Product'}
    </button>
  </div>

  {catalogResults.length > 0 && (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-slate-700">
        Found {catalogResults.length} possible result(s). Piliin ang tamang produkto:
      </p>

      {catalogResults.map((item, index) => (
        <div
          key={`${item.barcode}-${index}`}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-20 w-20 rounded-lg border border-slate-100 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
              No image
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{item.name}</p>
            <p className="text-sm text-slate-600">
              Brand: {item.brand || 'Not specified'}
            </p>
            <p className="text-sm text-slate-600">
              Category: {item.category || 'Not specified'}
            </p>
            <p className="break-all text-xs text-slate-500">
              Barcode: {item.barcode || 'Not available'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm((current) => ({
                ...current,
                name: item.name,
                barcode: item.barcode || current.barcode,
                brand: item.brand,
                category: item.category,
                imageUrl: item.imageUrl,
              }))

              setCatalogResults([])
              setSuccess(
                'Napili ang produkto. Ilagay o i-check ang presyo at stock bago i-save.',
              )
              setError('')
            }}
            className="shrink-0 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Use This Product
          </button>
        </div>
      ))}
    </div>
  )}
</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Product name *
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                maxLength={200}
                required
                placeholder="e.g. Animal Feeds"
              />
            </label>

            

           
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Barcode
                <input
                    className={inputClass}
                    value={form.barcode}
                    onChange={(e) => updateField('barcode', e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        void lookupBarcode()
                    }
                    }}
                    placeholder="Scan or type barcode"
                />

                <button
                    type="button"
                    onClick={() => void lookupBarcode()}
                    disabled={lookupLoading || !storeId}
                    className="mt-2 w-full rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                    {lookupLoading ? 'Searching product...' : 'Lookup Barcode'}
                </button>
                </label>


            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Category
              <input
                className={inputClass}
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="e.g. Animal Feeds"
              />
            </label>

            
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Brand
            <input
                className={inputClass}
                value={form.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                placeholder="e.g. Nova"
            />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
            Product image URL
            <input
                className={inputClass}
                type="url"
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="Auto-filled when available"
            />
            </label>

            {form.imageUrl && (
            <div className="sm:col-span-2 lg:col-span-3">
                <p className="mb-2 text-sm font-medium text-slate-700">
                Product image preview
                </p>
                <img
                src={form.imageUrl}
                alt={form.name || 'Product preview'}
                className="h-32 w-32 rounded-xl border border-slate-200 object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none'
                }}
                />
            </div>
            )}


            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Unit
              <select
                className={inputClass}
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
              >
                <option value="piece">Piece</option>
                <option value="bag">Bag</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="gram">Gram (g)</option>
                <option value="liter">Liter (L)</option>
                <option value="pack">Pack</option>
                <option value="box">Box</option>
                <option value="load">Load</option>
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Cost price (₱) *
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => updateField('costPrice', e.target.value)}
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Retail price (₱) *
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.retailPrice}
                onChange={(e) => updateField('retailPrice', e.target.value)}
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Wholesale price (₱)
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={form.wholesalePrice}
                onChange={(e) =>
                  updateField('wholesalePrice', e.target.value)
                }
                placeholder="Optional"
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Initial stock *
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.001"
                value={form.stockQuantity}
                onChange={(e) =>
                  updateField('stockQuantity', e.target.value)
                }
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Low-stock threshold *
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.001"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  updateField('lowStockThreshold', e.target.value)
                }
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
              Description
              <textarea
                className={inputClass}
                rows={2}
                value={form.description}
                onChange={(e) =>
                  updateField('description', e.target.value)
                }
                placeholder="Optional product details"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(initialForm)
                setError('')
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !storeId}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Product List</h3>
            <p className="mt-1 text-xs text-slate-500">
              {products.length} product{products.length === 1 ? '' : 's'} in
              this store
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className={`${inputClass} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode..."
              aria-label="Search products"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading products...
          </div>
        ) : !storeId ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Select a store to view its products.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center">
            <Package size={34} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">
              {search ? 'No matching products' : 'No products yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'Try a different search term.'
                : 'Add your first product to this store.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">SKU / Barcode</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Retail</th>
                  <th className="px-4 py-3 text-right">Wholesale</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const storeProduct = product.storeProducts[0]
                  const stock = Number(storeProduct?.stockQuantity ?? 0)
                  const threshold = Number(
                    storeProduct?.lowStockThreshold ?? 0,
                  )
                  const lowStock = stock <= threshold

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {product.category || 'Uncategorized'} · {product.unit}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{product.sku || '—'}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {product.barcode || 'No barcode'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {money(storeProduct?.costPrice ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">
                        {money(storeProduct?.retailPrice ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {storeProduct?.wholesalePrice == null
                          ? '—'
                          : money(storeProduct.wholesalePrice)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-semibold text-slate-900">
                          {stock.toLocaleString('en-PH')} {product.unit}
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            lowStock
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {lowStock ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
