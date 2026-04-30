<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Trade extends Model
{
    protected $fillable = [
        'booking_id',
        'tariff_id',
        'tariff_name',
        'hourly_rate',
        'payment_status',
        'session_status',
        'start_time',
        'end_time',
        'duration_minutes',
        'total_cost',
        'debt_name',
        'debt_phone_number',
        'asset_snapshot',
        'assets_count',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'asset_snapshot' => 'array',
        'hourly_rate' => 'float',
        'total_cost' => 'float',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
