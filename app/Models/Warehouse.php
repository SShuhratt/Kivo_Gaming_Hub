<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $table = 'warehouse';

    public const UNIT_DONA = 'dona';
    public const UNIT_KG = 'kg';
    public const UNIT_G = 'g';
    public const UNIT_L = 'l';
    public const UNIT_ML = 'ml';
    public const UNIT_QUTI = 'quti';
    public const UNIT_QADOQ = 'qadoq';
    public const UNIT_SHISHA = 'shisha';
    public const UNIT_M = 'm';
    public const UNIT_IDISH = 'idish';
    
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
            self::UNIT_DONA,
            self::UNIT_KG,
            self::UNIT_G,
            self::UNIT_L,
            self::UNIT_ML,
            self::UNIT_QUTI,
            self::UNIT_QADOQ,
            self::UNIT_SHISHA,
            self::UNIT_M,
            self::UNIT_IDISH,
        ];
    }

    public static function unitLabelsUz(): array
    {
        return [
            self::UNIT_DONA => 'dona',
            self::UNIT_KG => 'kg/kilogramm',
            self::UNIT_G => 'g/gramm',
            self::UNIT_L => 'l/litr',
            self::UNIT_ML => 'millilitr',
            self::UNIT_QUTI => 'quti',
            self::UNIT_QADOQ => 'qadoq',
            self::UNIT_SHISHA => 'shisha',
            self::UNIT_M => 'm/metr',
            self::UNIT_IDISH => 'idish',
        ];
    }

    public static function acceptedUnitInputs(): array
    {
        return [
            self::UNIT_DONA => self::UNIT_DONA,
            'piece' => self::UNIT_DONA,
            self::UNIT_KG => self::UNIT_KG,
            'kilogramm' => self::UNIT_KG,
            'kg/kilogramm' => self::UNIT_KG,
            'kg / kilogramm' => self::UNIT_KG,
            self::UNIT_G => self::UNIT_G,
            'gram' => self::UNIT_G,
            'gramm' => self::UNIT_G,
            'g/gramm' => self::UNIT_G,
            'g / gramm' => self::UNIT_G,
            self::UNIT_L => self::UNIT_L,
            'liter' => self::UNIT_L,
            'litr' => self::UNIT_L,
            'l/litr' => self::UNIT_L,
            'l / litr' => self::UNIT_L,
            self::UNIT_ML => self::UNIT_ML,
            'millilitr' => self::UNIT_ML,
            'ml/millilitr' => self::UNIT_ML,
            'ml / millilitr' => self::UNIT_ML,
            self::UNIT_QUTI => self::UNIT_QUTI,
            'box' => self::UNIT_QUTI,
            self::UNIT_QADOQ => self::UNIT_QADOQ,
            'pack' => self::UNIT_QADOQ,
            self::UNIT_SHISHA => self::UNIT_SHISHA,
            'bottle' => self::UNIT_SHISHA,
            self::UNIT_M => self::UNIT_M,
            'metr' => self::UNIT_M,
            'meter' => self::UNIT_M,
            'm/metr' => self::UNIT_M,
            'm / metr' => self::UNIT_M,
            self::UNIT_IDISH => self::UNIT_IDISH,
            'container' => self::UNIT_IDISH,
        ];
    }

    public static function legacyStoredUnitInputs(): array
    {
        return [
            'bag' => self::UNIT_QADOQ,
            'xalta' => self::UNIT_QADOQ,
        ];
    }

    public static function normalizeUnitInput(mixed $unit): ?string
    {
        if (! is_string($unit)) {
            return null;
        }

        $normalized = mb_strtolower(trim($unit));

        if ($normalized === '') {
            return null;
        }

        return self::acceptedUnitInputs()[$normalized] ?? null;
    }

    public static function normalizeStoredUnit(mixed $unit): ?string
    {
        $normalized = self::normalizeUnitInput($unit);

        if ($normalized !== null) {
            return $normalized;
        }

        if (! is_string($unit)) {
            return null;
        }

        $rawUnit = mb_strtolower(trim($unit));

        if ($rawUnit === '') {
            return null;
        }

        return self::legacyStoredUnitInputs()[$rawUnit] ?? null;
    }

    public static function unitLabel(?string $unit): string
    {
        if ($unit === null || $unit === '') {
            return '';
        }

        $normalizedUnit = self::normalizeStoredUnit($unit);

        if ($normalizedUnit === null) {
            return $unit;
        }

        return self::unitLabelsUz()[$normalizedUnit] ?? $normalizedUnit;
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

    public function getUnitAttribute(mixed $value): ?string
    {
        $normalizedUnit = self::normalizeStoredUnit($value);

        if ($normalizedUnit !== null) {
            return $normalizedUnit;
        }

        return is_string($value) ? trim($value) : null;
    }

    public function setUnitAttribute(mixed $value): void
    {
        $normalizedUnit = self::normalizeStoredUnit($value);

        $this->attributes['unit'] = $normalizedUnit ?? (is_string($value) ? trim($value) : $value);
    }

    public function checkoutSaleItems(): HasMany
    {
        return $this->hasMany(CheckoutSaleItem::class, 'warehouse_id');
    }
}
