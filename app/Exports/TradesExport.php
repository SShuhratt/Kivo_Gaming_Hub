<?php

namespace App\Exports;

class TradesExport
{
    public function __construct(
        protected array $rows,
    ) {
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

    public function rows(): array
    {
        return array_map(
            fn (array $row) => [
                $row['transaction_id'] ?? '',
                $row['type'] ?? '',
                $row['description'] ?? '',
                $row['product_service_session'] ?? '',
                $row['quantity'] ?? 0,
                $row['unit'] ?? '',
                $row['unit_price'] ?? 0,
                $row['total_amount'] ?? 0,
                $row['payment_method'] ?? '',
                $row['debtor_name'] ?? '',
                $row['debtor_phone'] ?? '',
                $row['status'] ?? '',
                $row['created_at'] ?? '',
            ],
            $this->rows,
        );
    }

    public function sheetName(): string
    {
        return 'Savdo';
    }
}
