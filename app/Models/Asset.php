<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Asset extends Model
{
    protected $fillable = [
        'category', 'room_id', 'total_usage_duration_minutes', 'total_earned_money'
    ];

    public function bookings(): BelongsToMany
    {
        return $this->belongsToMany(Booking::class);
    }
}
