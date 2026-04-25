<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

class TradeController extends Controller
{
    use ValidatesApiRequests;

    public function index(Request $request)
    {
        $validated = $this->validateApi($request, [
            'status' => 'nullable|in:submitted,debt_closed',
            'type' => 'nullable|in:Income,Debt',
        ]);

        $bookings = Booking::with('assets', 'tariff')
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->get();

        $ledger = $bookings->map(function ($booking) {
            return [
                'id' => $booking->id,
                'type' => $booking->status === 'submitted' ? 'Income' : 'Debt',
                'amount' => $booking->total_cost,
                'status' => $booking->status,
                'details' => [
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'duration_minutes' => $booking->duration_minutes,
                    'debt_info' => [
                        'name' => $booking->debt_name,
                        'phone' => $booking->debt_phone_number,
                    ],
                ],
                'tariff' => $booking->tariff->name ?? 'N/A',
                'tariff_data' => $booking->tariff,
                'assets' => $booking->assets,
                'assets_count' => $booking->assets->count(),
            ];
        });

        if ($validated['type'] ?? null) {
            $ledger = $ledger
                ->filter(fn (array $entry) => $entry['type'] === $validated['type'])
                ->values();
        }

        return response()->json($ledger);
    }
}
