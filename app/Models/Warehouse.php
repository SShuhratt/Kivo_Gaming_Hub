<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $table = 'warehouse';
    
    protected $fillable = [
        'manufacturer', 'product_name', 'shtrix_code', 'unit', 'count', 'purchase_price', 'sell_price'
    ];

    protected $appends = ['profit_percentage'];

    /**
     * Calculated virtual field for profit percentage.
     * Formula: ((sell_price - purchase_price) / purchase_price) * 100
     */
    public function getProfitPercentageAttribute(): float
    {
        if ($this->purchase_price <= 0) {
            return 0;
        }

        return (($this->sell_price - $this->purchase_price) / $this->purchase_price) * 100;
    }
}
