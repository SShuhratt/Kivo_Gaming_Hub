<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Booking, Asset, Tariff};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BookingController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/v1/bookings/calculate",
     *     summary="Calculate booking cost",
     *     tags={"Bookings"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"tariff_id", "asset_ids", "start_time", "end_time"},
     *             @OA\Property(property="tariff_id", type="integer", example=1),
     *             @OA\Property(property="asset_ids", type="array", @OA\Items(type="integer"), example={1, 2}),
     *             @OA\Property(property="start_time", type="string", format="date-time", example="2026-04-24 10:00:00"),
     *             @OA\Property(property="end_time", type="string", format="date-time", example="2026-04-24 12:00:00")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Cost calculated")
     * )
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'tariff_id' => 'required|exists:tariffs,id',
            'asset_ids' => 'required|array',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $tariff = Tariff::find($request->tariff_id);
        $start = Carbon::parse($request->start_time);
        $end = Carbon::parse($request->end_time);

        // Math: duration_hours * tariff.hourly_cost * asset_ids.length
        $durationMinutes = $end->diffInMinutes($start);
        $durationHours = $durationMinutes / 60;
        $totalCost = $durationHours * $tariff->hourly_cost * count($request->asset_ids);

        return response()->json([
            'duration_minutes' => $durationMinutes,
            'total_cost' => round($totalCost, 2)
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'tariff_id' => 'required|exists:tariffs,id',
            'asset_ids' => 'required|array',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'status' => 'required|in:submitted,debt_closed',
            'debt_name' => 'required_if:status,debt_closed',
            'debt_phone_number' => 'required_if:status,debt_closed',
        ]);

        return DB::transaction(function () use ($request) {
            $calculation = $this->calculate($request)->getData();

            $booking = Booking::create(array_merge($request->all(), [
                'duration_minutes' => $calculation->duration_minutes,
                'total_cost' => $calculation->total_cost,
            ]));

            $booking->assets()->attach($request->asset_ids);

            // Business Logic: Update assets
            foreach ($request->asset_ids as $assetId) {
                $asset = Asset::find($assetId);
                $asset->increment('total_usage_duration_minutes', $calculation->duration_minutes);
                $asset->increment('total_earned_money', $calculation->total_cost / count($request->asset_ids));
            }

            return response()->json($booking->load('assets'), 201);
        });
    }
}
