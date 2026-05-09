<?php

namespace App\Exports;

class ManufacturerProductsExport
{
    public function __construct(
        protected array $rows,
    ) {
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

    public function rows(): array
    {
        return array_map(
            fn (array $row) => [
                $row['product_id'] ?? '',
                $row['product_name'] ?? '',
                $row['manufacturer'] ?? '',
                $row['category'] ?? '',
                $row['barcode'] ?? '',
                $row['stock'] ?? 0,
                $row['unit'] ?? '',
                $row['purchase_price'] ?? 0,
                $row['sell_price'] ?? 0,
                $row['total_stock_value'] ?? 0,
                $row['created_at'] ?? '',
                $row['updated_at'] ?? '',
            ],
            $this->rows,
        );
    }

    public function sheetName(): string
    {
        return 'Mahsulotlar';
    }
}
