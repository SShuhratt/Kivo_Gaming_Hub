<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\Warehouse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

class WarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $items = Warehouse::query()
                ->with('manufacturerRecord')
                ->orderBy('manufacturer')
                ->orderBy('product_name')
                ->get()
                ->map(fn (Warehouse $warehouse) => $this->serializeWarehouseItem($warehouse))
                ->values();

            return response()->json($items);
        } catch (Throwable $e) {
            $this->logUnexpectedWarehouseException(
                'Failed to load warehouse items.',
                $request,
                $e,
            );

            return response()->json([
                'message' => 'Failed to load warehouse data.',
                'message_uz' => "Ombor ma'lumotlarini yuklab bo'lmadi.",
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $this->validateWarehousePayload($request);

            $warehouse = DB::transaction(function () use ($validated) {
                return Warehouse::create($this->buildWarehouseAttributes($validated));
            });

            return response()->json(
                $this->serializeWarehouseItem($warehouse->load('manufacturerRecord')),
                201,
            );
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (Throwable $e) {
            $this->logUnexpectedWarehouseException(
                'Failed to create warehouse product.',
                $request,
                $e,
                $this->extractManufacturerIdFromPayload($request),
            );

            return response()->json([
                'message' => 'Failed to save warehouse product.',
                'message_uz' => "Mahsulotni saqlab bo'lmadi.",
            ], 500);
        }
    }

    public function show(Request $request, Warehouse $warehouse): JsonResponse
    {
        try {
            return response()->json(
                $this->serializeWarehouseItem($warehouse->load('manufacturerRecord')),
            );
        } catch (Throwable $e) {
            $this->logUnexpectedWarehouseException(
                'Failed to load warehouse product.',
                $request,
                $e,
                $warehouse->manufacturer_id,
            );

            return response()->json([
                'message' => 'Failed to load warehouse product.',
                'message_uz' => "Mahsulot ma'lumotlarini yuklab bo'lmadi.",
            ], 500);
        }
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        try {
            $validated = $this->validateWarehousePayload($request, $warehouse);

            $warehouse = DB::transaction(function () use ($validated, $warehouse) {
                $warehouse->update($this->buildWarehouseAttributes($validated));

                return $warehouse;
            });

            return response()->json(
                $this->serializeWarehouseItem($warehouse->load('manufacturerRecord')),
            );
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (Throwable $e) {
            $this->logUnexpectedWarehouseException(
                'Failed to update warehouse product.',
                $request,
                $e,
                $warehouse->manufacturer_id ?? $this->extractManufacturerIdFromPayload($request),
            );

            return response()->json([
                'message' => 'Failed to update warehouse product.',
                'message_uz' => "Mahsulotni yangilab bo'lmadi.",
            ], 500);
        }
    }

    public function destroy(Request $request, Warehouse $warehouse): JsonResponse
    {
        try {
            $warehouse->delete();

            return response()->json(null, 204);
        } catch (Throwable $e) {
            $this->logUnexpectedWarehouseException(
                'Failed to delete warehouse product.',
                $request,
                $e,
                $warehouse->manufacturer_id,
            );

            return response()->json([
                'message' => 'Failed to delete warehouse product.',
                'message_uz' => "Mahsulotni o'chirib bo'lmadi.",
            ], 500);
        }
    }

    protected function validateWarehousePayload(Request $request, ?Warehouse $warehouse = null): array
    {
        $normalized = $this->normalizeWarehousePayload($request);

        if ($warehouse) {
            $normalized = array_merge(
                $this->warehouseDefaults($warehouse),
                array_filter($normalized, fn (mixed $value) => $value !== null),
            );
        }

        $validator = Validator::make($normalized, [
            'manufacturer_id' => ['nullable', 'integer', Rule::exists('manufacturers', 'id')],
            'manufacturer' => ['nullable', 'string', 'max:255', 'required_without:manufacturer_id'],
            'product_name' => ['required', 'string', 'max:255'],
            'shtrix_code' => [
                'required',
                'string',
                'max:255',
                Rule::unique('warehouse', 'shtrix_code')->ignore($warehouse?->id),
            ],
            'unit' => ['required', Rule::in(Warehouse::allowedUnits())],
            'count' => ['required', 'integer', 'min:0'],
            'purchase_price' => ['required', 'numeric', 'min:0'],
            'sell_price' => ['required', 'numeric', 'min:0'],
        ], $this->validationMessages(), $this->validationAttributes());

        if ($validator->fails()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422));
        }

        return $validator->validated();
    }

    protected function normalizeWarehousePayload(Request $request): array
    {
        $payload = $request->all();

        return [
            'manufacturer_id' => $this->valueFromPayload($payload, ['manufacturer_id']),
            'manufacturer' => $this->valueFromPayload($payload, ['manufacturer', 'manufacturer_name']),
            'product_name' => $this->valueFromPayload($payload, ['product_name', 'name']),
            'shtrix_code' => $this->valueFromPayload($payload, ['shtrix_code', 'barcode']),
            'unit' => $this->valueFromPayload($payload, ['unit']),
            'count' => $this->valueFromPayload($payload, ['count', 'quantity', 'stock', 'soni']),
            'purchase_price' => $this->valueFromPayload($payload, ['purchase_price']),
            'sell_price' => $this->valueFromPayload($payload, ['sell_price', 'sale_price', 'selling_price']),
        ];
    }

    protected function warehouseDefaults(Warehouse $warehouse): array
    {
        return [
            'manufacturer_id' => $warehouse->manufacturer_id,
            'manufacturer' => $warehouse->manufacturer,
            'product_name' => $warehouse->product_name,
            'shtrix_code' => $warehouse->shtrix_code,
            'unit' => $warehouse->unit,
            'count' => $warehouse->count,
            'purchase_price' => $warehouse->purchase_price,
            'sell_price' => $warehouse->sell_price,
        ];
    }

    protected function buildWarehouseAttributes(array $validated): array
    {
        $manufacturer = $this->resolveManufacturer($validated);

        return [
            'manufacturer' => $manufacturer?->name ?? trim((string) ($validated['manufacturer'] ?? '')),
            'manufacturer_id' => $manufacturer?->id,
            'product_name' => trim((string) $validated['product_name']),
            'shtrix_code' => trim((string) $validated['shtrix_code']),
            'unit' => $validated['unit'],
            'count' => (int) $validated['count'],
            'purchase_price' => (float) $validated['purchase_price'],
            'sell_price' => (float) $validated['sell_price'],
        ];
    }

    protected function resolveManufacturer(array $validated): ?Manufacturer
    {
        if (($validated['manufacturer_id'] ?? null) !== null) {
            return Manufacturer::query()->find((int) $validated['manufacturer_id']);
        }

        $manufacturerName = trim((string) ($validated['manufacturer'] ?? ''));

        if ($manufacturerName === '') {
            return null;
        }

        return Manufacturer::firstOrCreate([
            'name' => $manufacturerName,
        ]);
    }

    protected function serializeWarehouseItem(Warehouse $warehouse): array
    {
        $manufacturerRecord = $warehouse->manufacturerRecord;
        $manufacturerName = $manufacturerRecord?->name ?? (string) ($warehouse->manufacturer ?? '');
        $quantity = (int) ($warehouse->count ?? 0);
        $sellPrice = (float) ($warehouse->sell_price ?? 0);

        $serializedManufacturer = $manufacturerRecord
            ? [
                'id' => (int) $manufacturerRecord->id,
                'name' => $manufacturerRecord->name,
            ]
            : null;

        return [
            'id' => (int) $warehouse->id,
            'manufacturer_id' => $warehouse->manufacturer_id !== null ? (int) $warehouse->manufacturer_id : null,
            'manufacturer' => $manufacturerName,
            'product_name' => (string) ($warehouse->product_name ?? ''),
            'name' => (string) ($warehouse->product_name ?? ''),
            'shtrix_code' => (string) ($warehouse->shtrix_code ?? ''),
            'barcode' => (string) ($warehouse->shtrix_code ?? ''),
            'unit' => $warehouse->unit,
            'count' => $quantity,
            'quantity' => $quantity,
            'purchase_price' => (float) ($warehouse->purchase_price ?? 0),
            'sell_price' => $sellPrice,
            'sale_price' => $sellPrice,
            'profit_percentage' => (float) $warehouse->profit_percentage,
            'manufacturer_record' => $serializedManufacturer,
            'manufacturerRecord' => $serializedManufacturer,
        ];
    }

    protected function valueFromPayload(array $payload, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) {
                return $payload[$key];
            }
        }

        return null;
    }

    protected function extractManufacturerIdFromPayload(Request $request): ?int
    {
        $manufacturerId = $this->normalizeWarehousePayload($request)['manufacturer_id'] ?? null;

        return is_numeric($manufacturerId) ? (int) $manufacturerId : null;
    }

    protected function logUnexpectedWarehouseException(
        string $message,
        Request $request,
        Throwable $e,
        ?int $manufacturerId = null,
    ): void {
        Log::error($message, [
            'endpoint' => $request->method().' '.$request->path(),
            'user_id' => $request->user()?->id,
            'manufacturer_id' => $manufacturerId,
            'payload_keys' => array_keys($request->except(['password', 'password_confirmation', 'token'])),
            'exception_message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
    }

    protected function validationMessages(): array
    {
        return [
            'manufacturer_id.exists' => 'Tanlangan ishlab chiqaruvchi topilmadi.',
            'manufacturer.required' => 'Ishlab chiqaruvchi maydoni majburiy.',
            'manufacturer.required_without' => 'Ishlab chiqaruvchi maydoni majburiy.',
            'product_name.required' => 'Mahsulot nomi maydoni majburiy.',
            'shtrix_code.required' => 'Shtrix kod maydoni majburiy.',
            'shtrix_code.unique' => 'Bunday shtrix kodli mahsulot allaqachon mavjud.',
            'unit.required' => "O'lchov birligi maydoni majburiy.",
            'unit.in' => "Tanlangan o'lchov birligi noto'g'ri.",
            'count.required' => 'Miqdor maydoni majburiy.',
            'count.integer' => 'Miqdor butun son bo\'lishi kerak.',
            'count.min' => 'Miqdor 0 dan kichik bo\'lishi mumkin emas.',
            'purchase_price.required' => 'Olish narxi maydoni majburiy.',
            'purchase_price.numeric' => 'Olish narxi raqam bo\'lishi kerak.',
            'purchase_price.min' => 'Olish narxi 0 dan kichik bo\'lishi mumkin emas.',
            'sell_price.required' => 'Sotish narxi maydoni majburiy.',
            'sell_price.numeric' => 'Sotish narxi raqam bo\'lishi kerak.',
            'sell_price.min' => 'Sotish narxi 0 dan kichik bo\'lishi mumkin emas.',
        ];
    }

    protected function validationAttributes(): array
    {
        return [
            'manufacturer_id' => 'Ishlab chiqaruvchi',
            'manufacturer' => 'Ishlab chiqaruvchi',
            'product_name' => 'Mahsulot nomi',
            'shtrix_code' => 'Shtrix kod',
            'unit' => "O'lchov birligi",
            'count' => 'Miqdor',
            'purchase_price' => 'Olish narxi',
            'sell_price' => 'Sotish narxi',
        ];
    }
}
