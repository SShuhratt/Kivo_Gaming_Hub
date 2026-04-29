<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\{Booking, Tariff, Asset};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    use ValidatesApiRequests;

    public function calculate(Request $request)
    {
        $validated = $this->validateApi($request, [
            'tariff_id' => 'required|exists:tariffs,id',
            'asset_ids' => 'required|array',
            'asset_ids.*' => 'required|integer|distinct|exists:assets,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);

        $calculation = $this->calculateTotals($validated);

        return response()->json([
            'duration_minutes' => $calculation['duration_minutes'],
            'total_cost' => $calculation['total_cost'],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'tariff_id' => 'required|exists:tariffs,id',
            'asset_ids' => 'required|array|min:1',
            'asset_ids.*' => 'required|integer|distinct|exists:assets,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'status' => 'required|in:submitted,debt_closed',
            'debt_name' => 'required_if:status,debt_closed|nullable|string',
            'debt_phone_number' => 'required_if:status,debt_closed|nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $calculation = $this->calculateTotals($validated);

            $booking = Booking::create([
                'tariff_id' => $validated['tariff_id'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'duration_minutes' => $calculation['duration_minutes'],
                'total_cost' => $calculation['total_cost'],
                'status' => $validated['status'],
                'debt_name' => $validated['debt_name'] ?? null,
                'debt_phone_number' => $validated['debt_phone_number'] ?? null,
            ]);

            $booking->assets()->sync($validated['asset_ids']);

            $assets = Asset::whereIn('id', $validated['asset_ids'])->lockForUpdate()->get();
            $assetCount = count($validated['asset_ids']);
            $earnedPerAsset = $assetCount > 0 ? $calculation['total_cost'] / $assetCount : 0;

            foreach ($assets as $asset) {
                $asset->increment('total_usage_duration_minutes', $calculation['duration_minutes']);
                $asset->increment('total_earned_money', $earnedPerAsset);
            }

            return response()->json($booking->load('assets', 'tariff'), 201);
        });
    }

    public function destroy(Booking $booking)
    {
        try {
            DB::transaction(function () use ($booking) {
                $booking->load('assets');

                $assetCount = $booking->assets->count();
                $earnedPerAsset = $assetCount > 0 ? $booking->total_cost / $assetCount : 0;

                foreach ($booking->assets as $asset) {
                    $asset->update([
                        'total_usage_duration_minutes' => max(0, $asset->total_usage_duration_minutes - $booking->duration_minutes),
                        'total_earned_money' => max(0, (float) $asset->total_earned_money - $earnedPerAsset),
                    ]);
                }

                $booking->delete();
            });

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete booking', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete booking.',
            ], 500);
        }
    }

    protected function calculateTotals(array $payload): array
    {
        $tariff = Tariff::findOrFail($payload['tariff_id']);
        $start = Carbon::parse($payload['start_time']);
        $end = Carbon::parse($payload['end_time']);
        $durationMinutes = (int) $start->diffInMinutes($end);
        $durationHours = $durationMinutes / 60;

        // Booking math: duration_hours * tariff.hourly_cost * selected_asset_count.
        $totalCost = $durationHours * $tariff->hourly_cost * count($payload['asset_ids']);

        return [
            'duration_minutes' => $durationMinutes,
            'total_cost' => round($totalCost, 2),
        ];
    }
}
