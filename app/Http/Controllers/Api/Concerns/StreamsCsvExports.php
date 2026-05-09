<?php

namespace App\Http\Controllers\Api\Concerns;

use Symfony\Component\HttpFoundation\StreamedResponse;

trait StreamsCsvExports
{
    protected function streamCsvDownload(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, $this->normalizeCsvRow($row));
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    protected function normalizeCsvRow(array $row): array
    {
        return array_map(function ($value) {
            if ($value === null) {
                return '';
            }

            if (is_bool($value)) {
                return $value ? '1' : '0';
            }

            return $value;
        }, $row);
    }
}
