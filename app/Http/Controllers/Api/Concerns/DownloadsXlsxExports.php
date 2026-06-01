<?php

namespace App\Http\Controllers\Api\Concerns;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait DownloadsXlsxExports
{
    /**
     * Build an XLSX file from headings + rows and stream it as a download response.
     */
    protected function downloadXlsx(
        string $filename,
        string $sheetName,
        array  $headings,
        array  $rows,
    ): StreamedResponse {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($sheetName, 0, 31)); // Excel sheet-name limit

        // Write headings + data rows in one call (starts at A1)
        $data = [$headings, ...$rows];
        $sheet->fromArray($data, null, 'A1');

        // Style the header row (bold + light-grey background)
        if (!empty($headings)) {
            $lastCol = $sheet->getHighestColumn();
            $headerRange = 'A1:'.$lastCol.'1';

            $sheet->getStyle($headerRange)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => '1A1A1A'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'D9E1F2'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ]);

            // Auto-size each column for readability
            foreach (range('A', $lastCol) as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
        }

        // Stream the file directly without touching the filesystem
        $writer = new Xlsx($spreadsheet);

        return response()->stream(
            function () use ($writer) {
                $writer->save('php://output');
            },
            200,
            [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control'       => 'max-age=0',
                'Pragma'              => 'public',
            ],
        );
    }

}
