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
}
