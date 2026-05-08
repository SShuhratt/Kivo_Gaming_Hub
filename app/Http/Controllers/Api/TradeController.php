<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Services\SessionLifecycleService;
use Illuminate\Http\Request;

class TradeController extends Controller
{
    use FormatsSessionPayloads;
    use ValidatesApiRequests;

    public function index(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        $validated = $this->validateApi($request, [
            'status' => 'nullable|in:submitted,debt_closed',
            'type' => 'nullable|in:Income,Debt',
        ]);

        $sessionLifecycle->syncElapsedSessions();

        $ledger = Trade::query()
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('payment_status', $status)
            )
            ->latest('end_time')
            ->get()
            ->map(fn (Trade $trade) => $this->formatTradeLedgerEntry($trade));

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
            $booking = \App\Models\Booking::findOrFail($bookingId);

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

    public function destroyDebt(string $id)
    {
        if (str_starts_with($id, 'trade-')) {
            $tradeId = substr($id, 6);
            $trade = Trade::findOrFail($tradeId);
            
            if ($trade->payment_status !== 'submitted') {
                return response()->json(['message' => 'Faqat to\'liq to\'langan qarzlarni o\'chirish mumkin.'], 400);
            }
            
            $trade->update(['is_deleted_from_debts' => true]);

            return response()->json(['message' => 'Debt removed from list']);
        } elseif (str_starts_with($id, 'booking-')) {
            $bookingId = substr($id, 8);
            $booking = \App\Models\Booking::findOrFail($bookingId);
            
            if ($booking->status !== 'submitted') {
                return response()->json(['message' => 'Faqat to\'liq to\'langan qarzlarni o\'chirish mumkin.'], 400);
            }
            
            $booking->update(['is_deleted_from_debts' => true]);

            return response()->json(['message' => 'Debt removed from list']);
        }

        abort(404);
    }
}
