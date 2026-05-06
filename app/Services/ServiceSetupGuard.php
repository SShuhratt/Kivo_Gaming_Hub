<?php

namespace App\Services;

use App\Models\Service;
use Illuminate\Http\Exceptions\HttpResponseException;

class ServiceSetupGuard
{
    public const MESSAGE_EN = 'Create services first. Services define asset categories and prices.';
    public const MESSAGE_UZ = 'Avval xizmatlarni yarating. Xizmatlar jihoz kategoriyalari va narxlarini belgilaydi.';

    public function servicesReady(): bool
    {
        return Service::query()
            ->baseServices()
            ->whereNotNull('rate')
            ->exists();
    }

    public function ensureServicesExist(): void
    {
        if ($this->servicesReady()) {
            return;
        }

        throw new HttpResponseException(response()->json([
            'message' => self::MESSAGE_EN,
            'message_uz' => self::MESSAGE_UZ,
            'code' => 'services_required',
        ], 409));
    }
}
