<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckoutSaleItem extends Model
{
    protected $fillable = [
        'checkout_sale_id',
        'warehouse_id',
        'manufacturer_name',
        'product_name',
        'barcode',
        'unit',
        'quantity',
        'unit_price',
        'total_price',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'float',
        'total_price' => 'float',
    ];

    public function checkoutSale(): BelongsTo
    {
        return $this->belongsTo(CheckoutSale::class);
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function getUnitAttribute(mixed $value): ?string
    {
        $normalizedUnit = Warehouse::normalizeStoredUnit($value);

        if ($normalizedUnit !== null) {
            return $normalizedUnit;
        }

        return is_string($value) ? trim($value) : null;
    }

    public function setUnitAttribute(mixed $value): void
    {
        $normalizedUnit = Warehouse::normalizeUnitInput($value);

        $this->attributes['unit'] = $normalizedUnit ?? (is_string($value) ? trim($value) : $value);
    }
}
