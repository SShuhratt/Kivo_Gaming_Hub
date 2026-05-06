<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $fillable = [
        'tariff_name_snapshot',
        'hourly_rate_snapshot',
        'asset_snapshot',
        'asset_stats_recorded',
        'start_time',
        'end_time',
        'ended_at',
        'duration_minutes',
        'requested_duration_hours',
        'total_cost',
        'status',
        'session_status',
        'is_vip',
        'debt_name',
        'debt_phone_number',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'ended_at' => 'datetime',
        'hourly_rate_snapshot' => 'float',
        'requested_duration_hours' => 'float',
        'total_cost' => 'float',
        'asset_snapshot' => 'array',
        'asset_stats_recorded' => 'boolean',
        'is_vip' => 'boolean',
    ];

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class);
    }

    public function trade(): HasOne
    {
        return $this->hasOne(Trade::class);
    }
}
