<?php

namespace App\Http\Controllers\Api;

use App\Exports\ManufacturerProductsExport;
use App\Http\Controllers\Api\Concerns\DownloadsXlsxExports;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\Warehouse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ManufacturerController extends Controller
{
    use DownloadsXlsxExports;
    use ValidatesApiRequests;

    public function destroy(Manufacturer $manufacturer)
    {
        if ($manufacturer->warehouseItems()->exists()) {
            return response()->json([
                'message' => 'Delete the manufacturer only after deleting all of its products.',
                'message_uz' => "Bu ishlab chiqaruvchiga tegishli mahsulotlar mavjud. Avval mahsulotlarni o'chiring.",
            ], 409);
        }

        try {
            $manufacturer->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete manufacturer', [
                'manufacturer_id' => $manufacturer->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete manufacturer.',
                'message_uz' => "Ishlab chiqaruvchini o'chirib bo'lmadi.",
            ], 500);
        }
    }

    public function exportProducts(Request $request, string $manufacturer)
    {
        $manufacturerId = (int) $manufacturer;

        try {
            $manufacturer = Manufacturer::find($manufacturerId);

            if (! $manufacturer) {
                return response()->json([
                    'message' => 'Manufacturer not found',
                ], 404);
            }

            $validated = $this->validateApi($request, [
                'search' => 'nullable|string',
            ]);

            if ($request->has('debug_probe')) {
                return response()->json([
                    'route' => 'manufacturers.products.export',
                    'manufacturer_id' => $manufacturer->id,
                    'user_id' => auth()->id(),
                    'authenticated' => auth()->check(),
                    'headers' => $request->headers->all(),
                ]);
            }

            if (!auth()->check()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $products = $manufacturer->warehouseItems()
                ->orderBy('product_name')
                ->get();

            if ($validated['search'] ?? null) {
                $search = mb_strtolower(trim((string) $validated['search']));

                if ($search !== '') {
                    $products = $products
                        ->filter(function (Warehouse $product) use ($search) {
                            return collect([
                                $product->product_name,
                                $product->manufacturer,
                                $product->shtrix_code,
                                Warehouse::unitLabel($product->unit),
                            ])->contains(
                                fn ($value) => is_string($value) && str_contains(mb_strtolower($value), $search),
                            );
                        })
                        ->values();
                }
            }

            if ($products->isEmpty()) {
                return response()->json([
                    'message' => 'No data available to export',
                    'message_uz' => "Eksport qilish uchun ma'lumot yo'q",
                ], 422);
            }

            Log::info('Manufacturer products export requested', [
                'user_id' => $request->user()?->id,
                'manufacturer_id' => $manufacturer->id,
                'count' => $products->count(),
                'filters' => $validated,
            ]);

            $export = new ManufacturerProductsExport(
                $products->map(fn (Warehouse $product) => [
                    'product_id' => $product->id ?? '',
                    'product_name' => (string) ($product->product_name ?? ''),
                    'manufacturer' => (string) ($product->manufacturer ?? ''),
                    'category' => '',
                    'barcode' => (string) ($product->shtrix_code ?? ''),
                    'stock' => (int) ($product->count ?? 0),
                    'unit' => (string) Warehouse::unitLabel($product->unit),
                    'purchase_price' => round((float) ($product->purchase_price ?? 0), 2),
                    'sell_price' => round((float) ($product->sell_price ?? 0), 2),
                    'total_stock_value' => round((float) ($product->count ?? 0) * (float) ($product->sell_price ?? 0), 2),
                    'created_at' => $this->formatExportDate($product->created_at),
                    'updated_at' => $this->formatExportDate($product->updated_at),
                ])->all()
            );

            return $this->downloadXlsx(
                'manufacturer-products-'.($this->manufacturerSlug($manufacturer) ?: 'manufacturer').'-'.now()->format('Y-m-d').'.xlsx',
                $export->sheetName(),
                $export->headings(),
                $export->rows(),
            );
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Export failed', [
                'endpoint' => request()->path(),
                'user_id' => auth()->id(),
                'manufacturer_id' => $manufacturerId ?? null,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'Export failed',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    protected function manufacturerSlug(Manufacturer $manufacturer): string
    {
        return Str::slug($manufacturer->name);
    }

    protected function formatExportDate(mixed $value): string
    {
        if ($value instanceof Carbon) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_string($value) && trim($value) !== '') {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        }

        return '';
    }
}
