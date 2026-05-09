<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Trade;
use App\Services\SessionLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TradeController extends Controller
{
    use FormatsSessionPayloads;
    use ValidatesApiRequests;

    public function index(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        $validated = $this->validateApi($request, [
            'status' => 'nullable|in:submitted,debt_closed',
            'type' => 'nullable|in:Income,Debt,Product Sale',
        ]);

        $sessionLifecycle->syncElapsedSessions();

        $ledger = $this->collectFinancialLedgerEntries();

        if ($validated['status'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['status'] === $validated['status'])
                ->values();
        }

        if ($validated['type'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['type'] === $validated['type'])
                ->values();
        }

        return response()->json($ledger);
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
}
