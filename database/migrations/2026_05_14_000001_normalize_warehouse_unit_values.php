<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $unitMap = [
            'piece' => 'dona',
            'gram' => 'g',
            'liter' => 'l',
            'box' => 'quti',
            'pack' => 'qadoq',
            'bottle' => 'shisha',
            'meter' => 'm',
            'container' => 'idish',
            'bag' => 'qadoq',
            'xalta' => 'qadoq',
            'kg/kilogramm' => 'kg',
            'kg / kilogramm' => 'kg',
            'g/gramm' => 'g',
            'g / gramm' => 'g',
            'l/litr' => 'l',
            'l / litr' => 'l',
            'ml/millilitr' => 'ml',
            'ml / millilitr' => 'ml',
            'm/metr' => 'm',
            'm / metr' => 'm',
        ];

        $this->normalizeTableUnits('warehouse', $unitMap);
        $this->normalizeTableUnits('checkout_sale_items', $unitMap);
    }

    public function down(): void
    {
        // Canonical Uzbek unit values are intentionally preserved on rollback.
    }

    protected function normalizeTableUnits(string $table, array $unitMap): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'unit')) {
            return;
        }

        foreach ($unitMap as $from => $to) {
            DB::table($table)
                ->where('unit', $from)
                ->update(['unit' => $to]);
        }
    }
};
