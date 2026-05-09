<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\CheckoutSale;
use App\Models\Warehouse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class CheckoutSaleController extends Controller
{
    use ValidatesApiRequests;

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'items' => 'required|array|min:1',
            'items.*.warehouse_id' => 'required|integer|distinct|exists:warehouse,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => ['required', Rule::in(['cash', 'terminal', 'click', 'payme'])],
        ], [
            'items.required' => "Savdo uchun kamida bitta mahsulot tanlang.",
            'items.array' => "Mahsulotlar ro'yxati noto'g'ri yuborildi.",
            'items.min' => "Savdo uchun kamida bitta mahsulot tanlang.",
            'items.*.warehouse_id.required' => 'Mahsulot identifikatori majburiy.',
            'items.*.warehouse_id.distinct' => "Bir mahsulot savatchada faqat bir marta bo'lishi kerak.",
            'items.*.warehouse_id.exists' => 'Tanlangan mahsulot topilmadi.',
            'items.*.quantity.required' => 'Mahsulot miqdori majburiy.',
            'items.*.quantity.integer' => 'Mahsulot miqdori butun son bo\'lishi kerak.',
            'items.*.quantity.min' => 'Mahsulot miqdori kamida 1 bo\'lishi kerak.',
            'payment_method.required' => "To'lov usuli majburiy.",
            'payment_method.in' => "Tanlangan to'lov usuli noto'g'ri.",
        ]);

        try {
            $sale = DB::transaction(function () use ($validated, $request) {
                $requestedItems = collect($validated['items'])
                    ->keyBy(fn (array $item) => (int) $item['warehouse_id']);

                $products = Warehouse::query()
                    ->whereIn('id', $requestedItems->keys()->all())
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $totalAmount = 0;
                $itemPayloads = [];

                foreach ($requestedItems as $warehouseId => $item) {
                    /** @var Warehouse|null $product */
                    $product = $products->get($warehouseId);

                    if (! $product) {
                        throw new HttpResponseException(response()->json([
                            'message' => 'Selected product was not found.',
                            'message_uz' => 'Tanlangan mahsulot topilmadi.',
                        ], 404));
                    }

                    $quantity = (int) $item['quantity'];

                    if ($product->count < $quantity) {
                        throw new HttpResponseException(response()->json([
                            'message' => 'Not enough stock for this product.',
                            'message_uz' => "Mahsulot omborda yetarli emas.",
                        ], 409));
                    }

                    $lineTotal = round((float) $product->sell_price * $quantity, 2);
                    $totalAmount += $lineTotal;

                    $itemPayloads[] = [
                        'warehouse_id' => $product->id,
                        'manufacturer_name' => $product->manufacturer,
                        'product_name' => $product->product_name,
                        'barcode' => $product->shtrix_code,
                        'unit' => $product->unit,
                        'quantity' => $quantity,
                        'unit_price' => (float) $product->sell_price,
                        'total_price' => $lineTotal,
                    ];

                    $product->decrement('count', $quantity);
                }

                $sale = CheckoutSale::create([
                    'user_id' => $request->user()?->id,
                    'payment_method' => $validated['payment_method'],
                    'total_amount' => $totalAmount,
                ]);

                $sale->items()->createMany($itemPayloads);

                return $sale->load(['items', 'user']);
            });

            return response()->json([
                'id' => $sale->id,
                'payment_method' => $sale->payment_method,
                'total_amount' => (float) $sale->total_amount,
                'cashier_name' => $sale->user?->name,
                'created_at' => $sale->created_at,
                'items' => $sale->items->map(fn ($item) => [
                    'id' => $item->id,
                    'warehouse_id' => $item->warehouse_id,
                    'manufacturer_name' => $item->manufacturer_name,
                    'product_name' => $item->product_name,
                    'barcode' => $item->barcode,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total_price' => (float) $item->total_price,
                ])->values(),
            ], 201);
        } catch (HttpResponseException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::error('Checkout sale failed', [
                'user_id' => $request->user()?->id,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Checkout sale failed.',
                'message_uz' => "Kassa savdosini yakunlab bo'lmadi.",
            ], 500);
        }
    }
}
