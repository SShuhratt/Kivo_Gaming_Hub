<?php

namespace App\Http\Controllers\Api;

use App\Exports\TradesExport;
use App\Http\Controllers\Api\Concerns\DownloadsXlsxExports;
use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Trade;
use App\Models\Warehouse;
use App\Services\ServiceFinanceReportService;
use App\Services\SessionLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class TradeController extends Controller
{
    use DownloadsXlsxExports;
    use FormatsSessionPayloads;
    use ValidatesApiRequests;

    public function index(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        $validated = $this->validateApi($request, [
            'status' => 'nullable|in:submitted,debt_closed',
            'type' => 'nullable|in:Income,Debt,Product Sale',
            'search' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,terminal,click,payme,debt',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $sessionLifecycle->syncElapsedSessions();

        $ledger = $this->filterFinancialLedgerEntries($this->collectFinancialLedgerEntries(), $validated);

        return response()->json($ledger);
    }

    public function serviceSummary(
        SessionLifecycleService $sessionLifecycle,
        ServiceFinanceReportService $serviceFinanceReport,
    ): JsonResponse {
        $sessionLifecycle->syncElapsedSessions();

        return response()->json($serviceFinanceReport->summary());
    }

    public function serviceDetails(
        SessionLifecycleService $sessionLifecycle,
        ServiceFinanceReportService $serviceFinanceReport,
    ): JsonResponse {
        $sessionLifecycle->syncElapsedSessions();

        return response()->json($serviceFinanceReport->details());
    }

    public function export(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        try {
            $validated = $this->validateApi($request, [
                'status' => 'nullable|in:submitted,debt_closed',
                'type' => 'nullable|in:Income,Debt,Product Sale',
                'search' => 'nullable|string',
                'payment_method' => 'nullable|in:cash,terminal,click,payme,debt',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date',
            ]);

            if ($request->has('debug_probe')) {
                return response()->json([
                    'route' => 'trades.export',
                    'user_id' => auth()->id(),
                    'authenticated' => auth()->check(),
                    'headers' => $request->headers->all(),
                ]);
            }

            if (!auth()->check()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }

            $sessionLifecycle->syncElapsedSessions();

            $ledger = $this->filterFinancialLedgerEntries($this->collectFinancialLedgerEntries(), $validated);

            if ($ledger->isEmpty()) {
                return response()->json([
                    'message' => 'No data available to export',
                    'message_uz' => "Eksport qilish uchun ma'lumot yo'q",
                ], 422);
            }

            $rows = $ledger->map(fn (array $entry) => $this->mapTradeExportRow($entry))->all();

            Log::info('Trade export requested', [
                'user_id' => auth()->id(),
                'count' => count($rows),
                'filters' => $validated,
            ]);

            $export = new TradesExport($rows);

            return $this->downloadXlsx(
                'savdo-export-'.now()->format('Y-m-d').'.xlsx',
                $export->sheetName(),
                $export->headings(),
                $export->rows(),
            );
        } catch (\Throwable $e) {
            Log::error('Export failed', [
                'endpoint' => request()->path(),
                'user_id' => auth()->id(),
                'manufacturer_id' => null,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'Export failed',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function debts(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        $validated = $this->validateApi($request, [
            'status' => 'nullable|in:active,ended,paid,unpaid',
        ]);

        $sessionLifecycle->syncElapsedSessions();

        $debts = $this->collectDebtRecords();

        if ($validated['status'] ?? null) {
            $status = $validated['status'];
            $debts = $debts
                ->filter(fn (array $entry) => $entry['session_state'] === $status || $entry['payment_state'] === $status)
                ->values();
        }

        return response()->json($debts);
    }

    public function markPaid(string $id)
    {
        if (str_starts_with($id, 'trade-')) {
            $tradeId = substr($id, 6);
            $trade = Trade::findOrFail($tradeId);

            if ($trade->payment_status !== 'submitted') {
                $trade->update(['payment_status' => 'submitted']);
            }

            return response()->json(['message' => 'Debt marked as paid']);
        } elseif (str_starts_with($id, 'booking-')) {
            $bookingId = substr($id, 8);
            $booking = Booking::findOrFail($bookingId);

            $updates = ['status' => 'submitted'];
            if ($booking->session_status === 'active') {
                $updates['session_status'] = 'completed';
                $updates['ended_at'] = now();
            }

            $booking->update($updates);

            return response()->json(['message' => 'Debt marked as paid']);
        }

        abort(404);
    }

    public function destroyDebt(string $id): JsonResponse
    {
        [$model, $record] = $this->resolveDebtDeletionTarget($id);

        $logContext = [
            'debt_id' => $record['id'],
            'source' => $record['source'],
            'payment_status' => $record['payment_status'],
            'remaining_amount' => (float) $record['remaining_amount'],
        ];

        if (! $this->isDebtFullyPaid($record)) {
            Log::info('Debt removal rejected', $logContext + ['deleted_or_hidden' => false]);

            return response()->json(['message' => 'Faqat to\'liq to\'langan qarzlarni o\'chirish mumkin.'], 409);
        }

        $model->is_deleted_from_debts = true;
        $model->save();

        Log::info('Debt removal completed', $logContext + ['deleted_or_hidden' => true]);

        return response()->json(['message' => 'Debt removed from list']);
    }

    protected function resolveDebtDeletionTarget(string $id): array
    {
        if (str_starts_with($id, 'trade-')) {
            $trade = Trade::findOrFail((int) substr($id, 6));

            return [$trade, $this->formatDebtRecordFromTrade($trade)];
        }

        if (str_starts_with($id, 'booking-')) {
            $booking = Booking::findOrFail((int) substr($id, 8));

            return [$booking, $this->formatDebtRecordFromBooking($booking)];
        }

        abort(404);
    }

    protected function isDebtFullyPaid(array $record): bool
    {
        return ($record['payment_state'] ?? null) === 'paid'
            && abs((float) ($record['remaining_amount'] ?? 0)) < 0.00001;
    }

    protected function filterFinancialLedgerEntries(Collection $ledger, array $filters): Collection
    {
        if ($filters['status'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['status'] === $filters['status'])
                ->values();
        }

        if ($filters['type'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['type'] === $filters['type'])
                ->values();
        }

        if ($filters['payment_method'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['payment_method'] === $filters['payment_method'])
                ->values();
        }

        if ($filters['search'] ?? null) {
            $search = mb_strtolower(trim((string) $filters['search']));

            if ($search !== '') {
                $ledger = $ledger
                    ->filter(function (array $entry) use ($search) {
                        return collect($this->tradeSearchableFields($entry))
                            ->filter(fn ($value) => $value !== null && $value !== '')
                            ->contains(fn ($value) => str_contains(mb_strtolower((string) $value), $search));
                    })
                    ->values();
            }
        }

        $dateFrom = $this->parseExportFilterDate($filters['date_from'] ?? null);
        $dateTo = $this->parseExportFilterDate($filters['date_to'] ?? null, true);

        if ($dateFrom || $dateTo) {
            $ledger = $ledger
                ->filter(function (array $entry) use ($dateFrom, $dateTo) {
                    $createdAt = $this->parseExportDateTime($entry['created_at'] ?? null);

                    if (! $createdAt) {
                        return false;
                    }

                    if ($dateFrom && $createdAt->lt($dateFrom)) {
                        return false;
                    }

                    if ($dateTo && $createdAt->gt($dateTo)) {
                        return false;
                    }

                    return true;
                })
                ->values();
        }

        return $ledger->values();
    }

    protected function tradeSearchableFields(array $entry): array
    {
        return [
            $entry['type_label'] ?? null,
            data_get($entry, 'details.reference_label'),
            data_get($entry, 'details.room_label'),
            data_get($entry, 'details.product.name'),
            data_get($entry, 'details.product.manufacturer'),
            $entry['cashier_name'] ?? null,
        ];
    }

    protected function mapTradeExportRow(array $entry): array
    {
        $productName = data_get($entry, 'details.product.name');
        $roomLabel = data_get($entry, 'details.room_label');
        $pricingLabel = data_get($entry, 'pricing.label');
        $serviceOrSession = $productName ?: collect([$pricingLabel, $roomLabel])->filter()->implode(' / ');
        $unit = data_get($entry, 'details.product.unit');
        $unitPrice = $entry['source'] === 'checkout_sale_item'
            ? data_get($entry, 'details.product.unit_price')
            : data_get($entry, 'pricing.hourly_rate');

        return [
            'transaction_id' => $entry['source'] === 'trade'
                ? 'trade-'.$entry['id']
                : 'checkout-sale-item-'.$entry['id'],
            'type' => $entry['type_label'] ?? $entry['type'] ?? '',
            'description' => data_get($entry, 'details.reference_label') ?? '',
            'product_service_session' => $serviceOrSession ?? '',
            'quantity' => (float) (data_get($entry, 'details.product.quantity') ?? 0),
            'unit' => Warehouse::unitLabel($unit) ?? '',
            'unit_price' => (float) ($unitPrice ?? 0),
            'total_amount' => (float) ($entry['amount'] ?? 0),
            'payment_method' => data_get($entry, 'details.payment_method_label', $this->paymentMethodLabel($entry['payment_method'] ?? 'cash')) ?? '',
            'debtor_name' => data_get($entry, 'details.debt_info.name') ?? '',
            'debtor_phone' => data_get($entry, 'details.debt_info.phone') ?? '',
            'status' => $entry['status'] ?? '',
            'created_at' => $this->formatExportDate($entry['created_at'] ?? null) ?? '',
        ];
    }

    protected function parseExportFilterDate(mixed $value, bool $endOfDay = false): ?Carbon
    {
        if ($value instanceof Carbon) {
            return $endOfDay ? $value->copy()->endOfDay() : $value->copy()->startOfDay();
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $date = Carbon::parse($value);

        return $endOfDay ? $date->endOfDay() : $date->startOfDay();
    }

    protected function parseExportDateTime(mixed $value): ?Carbon
    {
        if ($value instanceof Carbon) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value);
    }

    protected function formatExportDate(mixed $value): string
    {
        if ($value instanceof Carbon) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_string($value) && trim($value) !== '') {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        }

        return '';
    }
}
