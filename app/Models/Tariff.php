<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tariff extends Model
{
    protected $fillable = ['name', 'hourly_cost'];

    protected $casts = [
        'hourly_cost' => 'float',
    ];

    public function categoryPrices(): HasMany
    {
        return $this->hasMany(TariffCategoryPrice::class)->orderBy('category');
    }
}
