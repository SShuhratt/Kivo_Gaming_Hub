<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = [
        'name',
        'price',
        'rate',
        'requirements',
        'manual_priority',
        'savings_ratio',
        'is_recommendable',
    ];

    protected $casts = [
        'price' => 'float',
        'rate' => 'float',
        'requirements' => 'array',
        'manual_priority' => 'integer',
        'savings_ratio' => 'float',
        'is_recommendable' => 'boolean',
    ];

    protected $appends = [
        'is_bundle',
    ];

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function scopeBaseServices(Builder $query): Builder
    {
        return $query->whereNull('requirements');
    }

    public function scopeBundles(Builder $query): Builder
    {
        return $query->whereNotNull('requirements');
    }

    public function getPriceAttribute($value): ?float
    {
        if ($value !== null) {
            return round((float) $value, 2);
        }

        $rate = $this->attributes['rate'] ?? null;

        return $rate !== null ? round((float) $rate, 2) : null;
    }

    public function setPriceAttribute($value): void
    {
        $normalized = $value !== null ? round((float) $value, 2) : null;
        $this->attributes['price'] = $normalized;
        $this->attributes['rate'] = $normalized;
    }

    public function getRateAttribute($value): ?float
    {
        if ($value !== null) {
            return round((float) $value, 2);
        }

        $price = $this->attributes['price'] ?? null;

        return $price !== null ? round((float) $price, 2) : null;
    }

    public function setRateAttribute($value): void
    {
        $normalized = $value !== null ? round((float) $value, 2) : null;
        $this->attributes['rate'] = $normalized;
        $this->attributes['price'] = $normalized;
    }

    public function getIsBundleAttribute(): bool
    {
        return $this->normalizedRequirements() !== [];
    }

    public function normalizedRequirements(): array
    {
        return static::normalizeRequirementsMap($this->requirements);
    }

    public static function normalizeRequirementKey(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
    }

    public static function normalizeRequirementsMap(null|array|string $requirements): array
    {
        if (is_string($requirements)) {
            $decoded = json_decode($requirements, true);
            $requirements = is_array($decoded) ? $decoded : null;
        }

        if (! is_array($requirements)) {
            return [];
        }

        $normalized = [];

        foreach ($requirements as $key => $quantity) {
            $normalizedKey = static::normalizeRequirementKey(is_string($key) ? $key : null);
            $normalizedQuantity = (int) $quantity;

            if ($normalizedKey === '' || $normalizedQuantity <= 0) {
                continue;
            }

            $normalized[$normalizedKey] = ($normalized[$normalizedKey] ?? 0) + $normalizedQuantity;
        }

        ksort($normalized);

        return $normalized;
    }
}
