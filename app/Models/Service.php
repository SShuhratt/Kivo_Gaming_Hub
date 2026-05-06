<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = ['name', 'price'];

    protected $casts = [
        'price' => 'float',
    ];

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }
}
