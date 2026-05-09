<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StreamsCsvExports;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ManufacturerController extends Controller
{
    use StreamsCsvExports;
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

    public function exportProducts(Request $request, Manufacturer $manufacturer)
    {
        $validated = $this->validateApi($request, [
            'search' => 'nullable|string',
        ]);

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

        return $this->streamCsvDownload(
            'manufacturer-products-'.($this->manufacturerSlug($manufacturer) ?: 'manufacturer').'-'.now()->format('Y-m-d').'.csv',
            [
                'Mahsulot ID',
                'Mahsulot nomi',
                'Ishlab chiqaruvchi',
                'Turi / Kategoriya',
                'Shtrix kod',
                'Qoldiq',
                'Birlik',
                'Olish narxi',
                'Sotish narxi',
                'Jami zaxira qiymati',
                'Yaratilgan sana',
                'Yangilangan sana',
            ],
            $products->map(fn (Warehouse $product) => [
                'product_id' => $product->id,
                'product_name' => $product->product_name,
                'manufacturer' => $product->manufacturer,
                'category' => '',
                'barcode' => $product->shtrix_code,
                'stock' => $product->count,
                'unit' => Warehouse::unitLabel($product->unit),
                'purchase_price' => (float) $product->purchase_price,
                'sell_price' => (float) $product->sell_price,
                'total_stock_value' => round((float) $product->count * (float) $product->sell_price, 2),
                'created_at' => $this->formatExportDate($product->created_at),
                'updated_at' => $this->formatExportDate($product->updated_at),
            ])->all(),
        );
    }

    protected function manufacturerSlug(Manufacturer $manufacturer): string
    {
        return Str::slug($manufacturer->name);
    }

    protected function formatExportDate(?Carbon $value): string
    {
        return $value?->format('Y-m-d H:i:s') ?? '';
    }
}
