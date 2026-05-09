<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ManufacturerProductsExport implements FromArray, WithHeadings
{
    protected $rows;

    public function __construct(array $rows)
    {
        $this->rows = $rows;
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return [
            'Mahsulot ID',
            'Mahsulot nomi',
            'Ishlab chiqaruvchi',
            'Turi / Kategoriya',
            'Shtrix kod',
            'Qoldiq',
            'Birlik',
            'Olish narxi',
            'Sotish narxi',
            'Jami zaxira qiymati',
            'Yaratilgan sana',
            'Yangilangan sana',
        ];
    }
}
