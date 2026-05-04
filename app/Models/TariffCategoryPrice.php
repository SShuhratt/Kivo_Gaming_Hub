<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TariffCategoryPrice extends Model
{
    protected $fillable = [
        'tariff_id',
        'category',
        'category_key',
        'hourly_price',
    ];

    protected $casts = [
        'hourly_price' => 'float',
    ];

    public function tariff(): BelongsTo
    {
        return $this->belongsTo(Tariff::class);
    }
}
