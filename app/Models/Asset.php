<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Asset extends Model
{
    protected $appends = ['category'];

    protected $fillable = [
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
        'name', 'category', 'room_id', 'total_usage_duration_minutes', 'total_earned_money'
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
        'name',
        'service_id',
        'room_id',
        'total_usage_duration_minutes',
        'total_earned_money',
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
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
}
