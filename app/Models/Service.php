<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    protected $fillable = ['game_name', 'room_id', 'cost'];

    protected $casts = [
        'cost' => 'float',
    ];
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    protected $fillable = ['name', 'price'];

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }
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
}
