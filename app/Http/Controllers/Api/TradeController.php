<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;

class TradeController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/v1/trades",
     *     summary="Financial ledger of bookings",
     *     tags={"Finance"},
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Mapped ledger of Income and Debt",
     *         @OA\JsonContent(type="array", @OA\Items(type="object"))
     *     )
     * )
     */
    public function index()
    {
        $bookings = Booking::with('assets', 'tariff')->get();

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
                'assets_count' => $booking->assets->count(),
            ];
        });

        return response()->json($ledger);
    }
}
