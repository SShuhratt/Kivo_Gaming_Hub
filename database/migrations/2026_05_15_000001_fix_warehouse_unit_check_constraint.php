<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $canonicalUnits = [
            'dona',
            'kg',
            'g',
            'l',
            'ml',
            'quti',
            'qadoq',
            'shisha',
            'm',
            'idish',
        ];

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

        $this->dropWarehouseUnitConstraint();
        $this->normalizeTableUnits('warehouse', $unitMap);
        $this->normalizeTableUnits('checkout_sale_items', $unitMap);
        $this->addWarehouseUnitConstraint($canonicalUnits);
    }

    public function down(): void
    {
        $legacyUnits = [
            'bottle',
            'box',
            'container',
            'bag',
        ];

        $this->dropWarehouseUnitConstraint();
        $this->addWarehouseUnitConstraint($legacyUnits);
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

    protected function dropWarehouseUnitConstraint(): void
    {
        if (! $this->usesPostgres() || ! Schema::hasTable('warehouse') || ! Schema::hasColumn('warehouse', 'unit')) {
            return;
        }

        DB::statement('ALTER TABLE warehouse DROP CONSTRAINT IF EXISTS warehouse_unit_check');
    }

    protected function addWarehouseUnitConstraint(array $units): void
    {
        if (! $this->usesPostgres() || ! Schema::hasTable('warehouse') || ! Schema::hasColumn('warehouse', 'unit')) {
            return;
        }

        $allowedUnits = implode(', ', array_map(
            fn (string $unit): string => "'".str_replace("'", "''", $unit)."'",
            $units,
        ));

        DB::statement(
            "ALTER TABLE warehouse ADD CONSTRAINT warehouse_unit_check CHECK (unit IN ({$allowedUnits}))",
        );
    }

    protected function usesPostgres(): bool
    {
        return DB::getDriverName() === 'pgsql';
    }
};
