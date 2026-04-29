<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Warehouse extends Model
{
    protected $table = 'warehouse';
    
    protected $fillable = [
        'manufacturer',
        'manufacturer_id',
        'product_name',
        'shtrix_code',
        'unit',
        'count',
        'purchase_price',
        'sell_price',
    ];

    protected $appends = ['profit_percentage'];

    protected static function booted(): void
    {
        static::saving(function (Warehouse $warehouse) {
            $manufacturerName = trim((string) $warehouse->manufacturer);

            if ($manufacturerName === '') {
                return;
            }

            $manufacturer = Manufacturer::firstOrCreate([
                'name' => $manufacturerName,
            ]);

            $warehouse->manufacturer = $manufacturer->name;
            $warehouse->manufacturer_id = $manufacturer->id;
        });
    }

    /**
     * Calculated virtual field for profit percentage.
     * Formula: ((sell_price - purchase_price) / purchase_price) * 100
     */
    public function getProfitPercentageAttribute(): float
    {
        if ($this->purchase_price <= 0) {
            return 0;
        }

        return (($this->sell_price - $this->purchase_price) / $this->purchase_price) * 100;
    }

    public function manufacturerRecord(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class, 'manufacturer_id');
    }
}
