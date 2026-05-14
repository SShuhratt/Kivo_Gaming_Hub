<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manufacturer extends Model
{
    protected $fillable = ['name'];

    public function warehouseItems(): HasMany
    {
        return $this->hasMany(Warehouse::class, 'manufacturer_id');
    }
}
