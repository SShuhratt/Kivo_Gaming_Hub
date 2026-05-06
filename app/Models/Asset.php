<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Asset extends Model
{
    protected $appends = ['category', 'room_name', 'service_price'];

    protected $fillable = [
        'name',
        'service_id',
        'room_id',
        'total_usage_duration_minutes',
        'total_earned_money',
    ];

    protected $casts = [
        'total_earned_money' => 'float',
    ];

    public function bookings(): BelongsToMany
    {
        return $this->belongsToMany(Booking::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function getCategoryAttribute(): ?string
    {
        return $this->service?->name;
    }

    public function getRoomNameAttribute(): ?string
    {
        return $this->room?->name;
    }

    public function getServicePriceAttribute(): ?float
    {
        return $this->service?->rate;
    }
}
