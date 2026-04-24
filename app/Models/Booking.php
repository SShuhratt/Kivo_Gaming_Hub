<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Booking extends Model
{
    protected $fillable = [
        'tariff_id', 'start_time', 'end_time', 'duration_minutes', 
        'total_cost', 'status', 'debt_name', 'debt_phone_number'
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function tariff(): BelongsTo
    {
        return $this->belongsTo(Tariff::class);
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class);
    }
}
