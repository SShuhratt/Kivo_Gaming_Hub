<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Booking;
use App\Services\AssetServicePricingService;
use App\Services\ServiceSetupGuard;
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
            ->with(['assets.room', 'assets.service', 'trade'])
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

        $booking->load(['assets.room', 'assets.service', 'trade']);

        return response()->json($this->formatSession($booking));
    }

    public function calculate(
        Request $request,
        AssetServicePricingService $assetServicePricing,
        ServiceSetupGuard $serviceSetupGuard
    )
    {
        $serviceSetupGuard->ensureServicesExist();

        $validated = $this->validateApi($request, [
            'asset_ids' => 'required|array|min:1',
            'asset_ids.*' => 'required|integer|distinct|exists:assets,id',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after:start_time',
            'duration_hours' => 'nullable|numeric|min:0.1',
            'is_vip' => 'sometimes|boolean',
        ]);

        $timing = $this->resolveTiming($validated);
        $assets = $this->resolveAssets($validated['asset_ids']);
        $snapshot = $assetServicePricing->buildPricedAssetSnapshot($assets);
        $summary = $assetServicePricing->summarizeSnapshot($snapshot, $timing['duration_hours']);

        return response()->json([
            'duration_minutes' => $summary['duration_minutes'],
            'duration_hours' => $summary['duration_hours'],
            'hourly_rate_total' => $summary['hourly_rate_total'],
            'total_cost' => $summary['total_cost'],
            'is_vip' => $timing['is_vip'],
            'end_time' => $timing['end_time']?->toISOString(),
            'asset_breakdown' => collect($snapshot)->map(fn ($asset) => [
                'id' => $asset['id'],
                'name' => $asset['name'],
                'category' => $asset['category'],
                'service_name' => $asset['service_name'] ?? $asset['category'],
                'room_id' => $asset['room_id'],
                'room_name' => $asset['room_name'],
                'room_number' => $asset['room_number'],
                'asset_order' => $asset['asset_order'] ?? null,
                'hourly_price' => (float) ($asset['hourly_price'] ?? 0),
            ])->values()->all(),
        ]);
    }

    public function store(
        Request $request,
        SessionLifecycleService $sessionLifecycle,
        AssetServicePricingService $assetServicePricing,
        ServiceSetupGuard $serviceSetupGuard
    ) {
        $serviceSetupGuard->ensureServicesExist();

        $validated = $this->validateApi($request, [
            'asset_ids' => 'required|array|min:1',
            'asset_ids.*' => 'required|integer|distinct|exists:assets,id',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after:start_time',
            'duration_hours' => 'nullable|numeric|min:0.1',
            'is_vip' => 'sometimes|boolean',
            'status' => 'required|in:submitted,debt_closed',
            'debt_name' => 'required_if:status,debt_closed|nullable|string',
            'debt_phone_number' => 'required_if:status,debt_closed|nullable|string',
        ]);

        $timing = $this->resolveTiming($validated);

        $booking = DB::transaction(function () use ($validated, $timing, $assetServicePricing) {
            $assets = $this->resolveAssets($validated['asset_ids']);
            $snapshot = $assetServicePricing->buildPricedAssetSnapshot($assets);
            $summary = $assetServicePricing->summarizeSnapshot($snapshot, $timing['duration_hours']);

            $booking = Booking::create([
                'tariff_id' => null,
                'tariff_name_snapshot' => 'Service pricing',
                'hourly_rate_snapshot' => $summary['hourly_rate_total'],
                'asset_snapshot' => $snapshot,
                'asset_stats_recorded' => false,
                'start_time' => $timing['start_time'],
                'end_time' => $timing['end_time'],
                'ended_at' => null,
                'duration_minutes' => $summary['duration_minutes'],
                'requested_duration_hours' => $summary['duration_hours'],
                'total_cost' => $summary['total_cost'],
                'status' => $validated['status'],
                'session_status' => 'active',
                'is_vip' => $timing['is_vip'],
                'debt_name' => $validated['debt_name'] ?? null,
                'debt_phone_number' => $validated['debt_phone_number'] ?? null,
            ]);

            $booking->assets()->sync($validated['asset_ids']);

            return $booking;
        });

        if (! $booking->is_vip && $booking->end_time && Carbon::parse($booking->end_time)->lessThanOrEqualTo(Carbon::now())) {
            $booking = $sessionLifecycle->completeBooking($booking);
        } else {
            $booking->load(['assets.room', 'assets.service', 'trade']);
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

    protected function resolveAssets(array $assetIds)
    {
        return Asset::query()
            ->with(['room', 'service'])
            ->whereIn('id', $assetIds)
            ->orderBy('room_id')
            ->orderBy('id')
            ->get();
    }

    protected function resolveTiming(array $validated): array
    {
        $startTime = Carbon::parse($validated['start_time']);
        $isVip = (bool) ($validated['is_vip'] ?? false);
        $hasDuration = array_key_exists('duration_hours', $validated) && $validated['duration_hours'] !== null;
        $hasEndTime = array_key_exists('end_time', $validated) && $validated['end_time'] !== null;

        if ($isVip && ($hasDuration || $hasEndTime)) {
            $this->abortBadRequest([
                'duration_hours' => ['VIP booking cannot have a fixed duration or end time.'],
            ]);
        }

        if (! $isVip && $hasDuration && $hasEndTime) {
            $this->abortBadRequest([
                'duration_hours' => ['Use either duration_hours or end_time, not both.'],
            ]);
        }

        if ($isVip) {
            return [
                'is_vip' => true,
                'start_time' => $startTime,
                'end_time' => null,
                'duration_hours' => null,
            ];
        }

        if ($hasDuration) {
            $durationHours = round((float) $validated['duration_hours'], 2);
            $durationMinutes = (int) round($durationHours * 60);

            return [
                'is_vip' => false,
                'start_time' => $startTime,
                'end_time' => $startTime->copy()->addMinutes($durationMinutes),
                'duration_hours' => $durationHours,
            ];
        }

        if ($hasEndTime) {
            $endTime = Carbon::parse($validated['end_time']);
            $durationHours = round($startTime->diffInMinutes($endTime) / 60, 2);

            return [
                'is_vip' => false,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'duration_hours' => $durationHours,
            ];
        }

        $this->abortBadRequest([
            'duration_hours' => ['Duration is required unless VIP is selected.'],
        ]);
    }

    protected function abortBadRequest(array $errors): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Bad request.',
            'errors' => $errors,
        ], 400));
    }
}
