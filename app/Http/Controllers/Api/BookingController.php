<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Booking;
use App\Models\Tariff;
use App\Services\SessionLifecycleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    use FormatsSessionPayloads;
    use ValidatesApiRequests;

    public function index(Request $request, SessionLifecycleService $sessionLifecycle)
    {
        $validated = $this->validateApi($request, [
            'session_status' => 'nullable|in:active,completed,cancelled',
        ]);

        $sessionLifecycle->syncElapsedSessions();

        $bookings = Booking::query()
            ->with(['assets', 'tariff', 'trade'])
            ->when(
                $validated['session_status'] ?? null,
                fn ($query, $status) => $query->where('session_status', $status)
            )
            ->orderByRaw("case when session_status = 'active' then 0 else 1 end")
            ->latest('start_time')
            ->get()
            ->map(fn (Booking $booking) => $this->formatSession($booking))
            ->values();

        return response()->json($bookings);
    }

    public function show(Booking $booking, SessionLifecycleService $sessionLifecycle)
    {
        $sessionLifecycle->syncElapsedSessions();

        $booking->load(['assets', 'tariff', 'trade']);

        return response()->json($this->formatSession($booking));
    }

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

    public function store(Request $request, SessionLifecycleService $sessionLifecycle)
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

        $booking = DB::transaction(function () use ($validated) {
            $assets = Asset::query()
                ->whereIn('id', $validated['asset_ids'])
                ->orderBy('room_id')
                ->orderBy('id')
                ->get();
            $tariff = Tariff::findOrFail($validated['tariff_id']);
            $calculation = $this->calculateTotals($validated, $tariff, $assets->count());

            $booking = Booking::create([
                'tariff_id' => $validated['tariff_id'],
                'tariff_name_snapshot' => $tariff->name,
                'hourly_rate_snapshot' => (float) $tariff->hourly_cost,
                'asset_snapshot' => $assets->map(fn (Asset $asset) => [
                    'id' => $asset->id,
                    'category' => $asset->category,
                    'room_id' => $asset->room_id,
                    'room_number' => (string) $asset->room_id,
                ])->values()->all(),
                'asset_stats_recorded' => false,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'duration_minutes' => $calculation['duration_minutes'],
                'total_cost' => $calculation['total_cost'],
                'status' => $validated['status'],
                'session_status' => 'active',
                'debt_name' => $validated['debt_name'] ?? null,
                'debt_phone_number' => $validated['debt_phone_number'] ?? null,
            ]);

            $booking->assets()->sync($validated['asset_ids']);

            return $booking;
        });

        if (Carbon::parse($booking->end_time)->lessThanOrEqualTo(Carbon::now())) {
            $booking = $sessionLifecycle->completeBooking($booking);
        } else {
            $booking->load(['assets', 'tariff', 'trade']);
        }

        return response()->json($this->formatSession($booking), 201);
    }

    public function end(Booking $booking, SessionLifecycleService $sessionLifecycle)
    {
        $sessionLifecycle->syncElapsedSessions();

        $booking->refresh();

        if ($booking->session_status !== 'active') {
            return response()->json([
                'message' => 'Only active sessions can be ended manually.',
            ], 409);
        }

        $endedBooking = $sessionLifecycle->completeBooking($booking, Carbon::now());

        return response()->json($this->formatSession($endedBooking));
    }

    public function destroy(Booking $booking, SessionLifecycleService $sessionLifecycle)
    {
        $sessionLifecycle->syncElapsedSessions();

        $booking->load('trade');

        if ($booking->session_status === 'active') {
            return response()->json([
                'message' => 'Active sessions cannot be deleted.',
            ], 409);
        }

        if (! $booking->trade) {
            return response()->json([
                'message' => 'Completed session cannot be deleted before its trade history is saved.',
            ], 409);
        }

        try {
            DB::transaction(fn () => $booking->delete());

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

    public function update()
    {
        return response()->json([
            'message' => 'Updating sessions is not supported.',
        ], 405);
    }

    protected function calculateTotals(array $payload, ?Tariff $tariff = null, ?int $assetCount = null): array
    {
        $tariff ??= Tariff::findOrFail($payload['tariff_id']);
        $start = Carbon::parse($payload['start_time']);
        $end = Carbon::parse($payload['end_time']);
        $durationMinutes = (int) $start->diffInMinutes($end);
        $durationHours = $durationMinutes / 60;
        $assetCount ??= count($payload['asset_ids']);

        $totalCost = $durationHours * $tariff->hourly_cost * $assetCount;

        return [
            'duration_minutes' => $durationMinutes,
            'total_cost' => round($totalCost, 2),
        ];
    }
}
