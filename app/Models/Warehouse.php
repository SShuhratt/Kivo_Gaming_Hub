<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $table = 'warehouse';

    public const UNIT_PIECE = 'piece';
    public const UNIT_KG = 'kg';
    public const UNIT_GRAM = 'gram';
    public const UNIT_LITER = 'liter';
    public const UNIT_ML = 'ml';
    public const UNIT_BOX = 'box';
    public const UNIT_PACK = 'pack';
    public const UNIT_BOTTLE = 'bottle';
    public const UNIT_METER = 'meter';
    public const UNIT_CONTAINER = 'container';
    public const UNIT_BAG = 'bag';
    
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

    protected $casts = [
        'manufacturer_id' => 'integer',
        'count' => 'integer',
        'purchase_price' => 'float',
        'sell_price' => 'float',
    ];

    public static function allowedUnits(): array
    {
        return [
            self::UNIT_PIECE,
            self::UNIT_KG,
            self::UNIT_GRAM,
            self::UNIT_LITER,
            self::UNIT_ML,
            self::UNIT_BOX,
            self::UNIT_PACK,
            self::UNIT_BOTTLE,
            self::UNIT_METER,
            self::UNIT_CONTAINER,
            self::UNIT_BAG,
        ];
    }

    public static function unitLabelsUz(): array
    {
        return [
            self::UNIT_PIECE => 'dona',
            self::UNIT_KG => 'kg / kilogramm',
            self::UNIT_GRAM => 'g / gramm',
            self::UNIT_LITER => 'l / litr',
            self::UNIT_ML => 'ml / millilitr',
            self::UNIT_BOX => 'quti',
            self::UNIT_PACK => 'qadoq',
            self::UNIT_BOTTLE => 'shisha',
            self::UNIT_METER => 'm / metr',
            self::UNIT_CONTAINER => 'idish',
            self::UNIT_BAG => 'xalta',
        ];
    }

    public static function unitLabel(?string $unit): string
    {
        if ($unit === null || $unit === '') {
            return '';
        }

        return self::unitLabelsUz()[$unit] ?? $unit;
    }

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

    public function checkoutSaleItems(): HasMany
    {
        return $this->hasMany(CheckoutSaleItem::class, 'warehouse_id');
    }
}
