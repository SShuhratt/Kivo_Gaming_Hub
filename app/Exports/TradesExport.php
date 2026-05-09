<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class TradesExport implements FromArray, WithHeadings
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
            'Tranzaksiya ID',
            'Turi',
            'Nomi / Tavsif',
            'Mahsulot / Xizmat / Seans',
            'Miqdor',
            'Birlik',
            'Birlik narxi',
            'Jami summa',
            "To'lov usuli",
            'Qarzdor ismi',
            'Qarzdor telefoni',
            'Holat',
            'Yaratilgan sana',
        ];
    }
}
