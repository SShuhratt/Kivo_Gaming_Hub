<?php

namespace Tests\Feature;

use App\Models\Trade;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CsvExportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_trade_export_downloads_filtered_xlsx_that_includes_checkout_sales(): void
    {
        Carbon::setTestNow('2026-05-09T12:00:00+05:00');

        Warehouse::create([
            'manufacturer' => 'Sony',
            'product_name' => 'DualSense',
            'shtrix_code' => 'TRADE-0001',
            'unit' => 'piece',
            'count' => 3,
            'purchase_price' => 500000,
            'sell_price' => 650000,
        ]);

        $product = Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi 0.5L',
            'shtrix_code' => 'TRADE-0002',
            'unit' => 'bottle',
            'count' => 10,
            'purchase_price' => 6000,
            'sell_price' => 9000,
        ]);

        Trade::create([
            'booking_id' => null,
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 50000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-05-09T09:00:00+05:00',
            'end_time' => '2026-05-09T10:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 50000,
            'asset_snapshot' => [['id' => 1, 'category' => 'Computer', 'room_id' => 1, 'room_number' => 'VIP 1']],
            'assets_count' => 1,
        ]);

        $this->postJson('/api/checkout-sales', [
            'payment_method' => 'cash',
            'items' => [
                [
                    'warehouse_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
        ], $this->authHeaders())->assertCreated();

        $response = $this->get('/api/trades/export?search=pepsi', $this->authHeaders());

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $this->assertSame(
            'attachment; filename=savdo-export-2026-05-09.xlsx',
            $response->headers->get('content-disposition'),
        );

        $rows = $this->xlsxRows($response);

        $this->assertCount(2, $rows);
        $this->assertSame('Tranzaksiya ID', $rows[0][0]);
        $this->assertSame('Mahsulot savdosi', $rows[1][1]);
        $this->assertSame('Pepsi 0.5L', $rows[1][3]);
        $this->assertSame(2, $rows[1][4]);
        $this->assertSame('shisha', $rows[1][5]);
        $this->assertSame(9000, $rows[1][6]);
        $this->assertSame(18000, $rows[1][7]);
        $this->assertSame('Naqd', $rows[1][8]);
    }

    public function test_manufacturer_product_export_downloads_only_matching_products_for_that_manufacturer(): void
    {
        $matchingProduct = Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi oila qutisi',
            'shtrix_code' => 'WAREHOUSE-0001',
            'unit' => 'box',
            'count' => 4,
            'purchase_price' => 15000,
            'sell_price' => 22000,
        ])->refresh();

        Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi dona',
            'shtrix_code' => 'WAREHOUSE-0002',
            'unit' => 'piece',
            'count' => 7,
            'purchase_price' => 5000,
            'sell_price' => 9000,
        ]);

        Warehouse::create([
            'manufacturer' => 'Coca-Cola',
            'product_name' => 'Coke box',
            'shtrix_code' => 'WAREHOUSE-0003',
            'unit' => 'box',
            'count' => 2,
            'purchase_price' => 14000,
            'sell_price' => 21000,
        ]);

        $response = $this->get(
            "/api/manufacturers/{$matchingProduct->manufacturer_id}/products/export?search=quti",
            $this->authHeaders(),
        );

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $rows = $this->xlsxRows($response);

        $this->assertCount(2, $rows);
        $this->assertSame('Mahsulot ID', $rows[0][0]);
        $this->assertSame($matchingProduct->id, $rows[1][0]);
        $this->assertSame('Pepsi oila qutisi', $rows[1][1]);
        $this->assertSame('Pepsi', $rows[1][2]);
        $this->assertSame('quti', $rows[1][6]);
        $this->assertSame(88000, $rows[1][9]);
    }

    public function test_export_endpoints_return_a_clear_empty_state_message_when_no_rows_match(): void
    {
        $manufacturerProduct = Warehouse::create([
            'manufacturer' => 'Nestle',
            'product_name' => 'KitKat',
            'shtrix_code' => 'EMPTY-0001',
            'unit' => 'piece',
            'count' => 5,
            'purchase_price' => 4000,
            'sell_price' => 7000,
        ])->refresh();

        $this->getJson('/api/trades/export?search=hech-narsa', $this->authHeaders())
            ->assertStatus(422)
            ->assertJson([
                'message' => 'No data available to export',
                'message_uz' => "Eksport qilish uchun ma'lumot yo'q",
            ]);

        $this->getJson(
            "/api/manufacturers/{$manufacturerProduct->manufacturer_id}/products/export?search=topilmadi",
            $this->authHeaders(),
        )
            ->assertStatus(422)
            ->assertJson([
                'message' => 'No data available to export',
                'message_uz' => "Eksport qilish uchun ma'lumot yo'q",
            ]);
    }

    public function test_export_probe_returns_a_hardcoded_xlsx_for_both_endpoints(): void
    {
        $manufacturerProduct = Warehouse::create([
            'manufacturer' => 'Probe Co',
            'product_name' => 'Probe Item',
            'shtrix_code' => 'PROBE-0001',
            'unit' => 'piece',
            'count' => 1,
            'purchase_price' => 1000,
            'sell_price' => 1500,
        ])->refresh();

        $tradeProbeResponse = $this->get('/api/trades/export?debug_probe=1', $this->authHeaders());
        $tradeProbeResponse
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $tradeProbeRows = $this->xlsxRows($tradeProbeResponse);
        $this->assertSame([['Test', 'Value'], ['OK', 1]], $tradeProbeRows);

        $manufacturerProbeResponse = $this->get(
            "/api/manufacturers/{$manufacturerProduct->manufacturer_id}/products/export?debug_probe=1",
            $this->authHeaders(),
        );
        $manufacturerProbeResponse
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $manufacturerProbeRows = $this->xlsxRows($manufacturerProbeResponse);
        $this->assertSame([['Test', 'Value'], ['OK', 1]], $manufacturerProbeRows);
    }

    protected function xlsxRows(TestResponse $response): array
    {
        $content = $response->streamedContent();
        $path = tempnam(sys_get_temp_dir(), 'export-xlsx-');
        $extractDir = sys_get_temp_dir().'/export-xlsx-'.uniqid('', true);
        $archivePath = base_path('vendor/phpoffice/phpexcel/Classes/PHPExcel/Shared/PCLZip/pclzip.lib.php');

        file_put_contents($path, $content);
        mkdir($extractDir, 0777, true);

        require_once $archivePath;

        $archive = new \PclZip();
        $archive->PclZip($path);
        $result = $archive->extract(PCLZIP_OPT_PATH, $extractDir);

        $this->assertNotSame(0, $result, 'Failed to extract generated XLSX archive.');

        $sheetPath = $extractDir.'/xl/worksheets/sheet1.xml';
        $this->assertFileExists($sheetPath);

        $document = new \DOMDocument();
        $document->load($sheetPath);

        $xpath = new \DOMXPath($document);
        $xpath->registerNamespace('sheet', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        $rows = [];

        foreach ($xpath->query('//sheet:sheetData/sheet:row') as $rowNode) {
            $row = [];

            foreach ($xpath->query('./sheet:c', $rowNode) as $cellNode) {
                $reference = $cellNode->attributes?->getNamedItem('r')?->nodeValue ?? '';
                $columnIndex = $this->columnIndexFromCellReference($reference);

                while (count($row) < $columnIndex) {
                    $row[] = '';
                }

                $row[] = $this->cellValueFromNode($xpath, $cellNode);
            }

            $rows[] = $row;
        }

        @unlink($path);
        $this->deleteDirectory($extractDir);

        return $rows;
    }

    protected function cellValueFromNode(\DOMXPath $xpath, \DOMNode $cellNode): int|float|string
    {
        $type = $cellNode->attributes?->getNamedItem('t')?->nodeValue;

        if ($type === 'inlineStr') {
            return (string) $xpath->evaluate('string(sheet:is/sheet:t)', $cellNode);
        }

        $value = (string) $xpath->evaluate('string(sheet:v)', $cellNode);

        if ($value === '') {
            return '';
        }

        if (is_numeric($value)) {
            return str_contains($value, '.') ? (float) $value : (int) $value;
        }

        return $value;
    }

    protected function columnIndexFromCellReference(string $reference): int
    {
        $letters = preg_replace('/[^A-Z]/', '', strtoupper($reference)) ?? '';
        $index = 0;

        foreach (str_split($letters) as $letter) {
            $index = ($index * 26) + (ord($letter) - 64);
        }

        return max(0, $index - 1);
    }

    protected function deleteDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $entryPath = $path.'/'.$entry;

            if (is_dir($entryPath)) {
                $this->deleteDirectory($entryPath);
            } else {
                @unlink($entryPath);
            }
        }

        @rmdir($path);
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer '.$this->loginToken()];
    }

    protected function loginToken(): string
    {
        User::updateOrCreate(
            ['phone_number' => '+998901234567'],
            [
                'name' => 'CSV Export User',
                'gmail' => 'csv-export-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
