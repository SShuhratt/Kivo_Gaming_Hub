<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class NotificationServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Contracts\SmsServiceInterface::class, function ($app) {
            $driver = config('services.sms.driver', 'log');

            return match ($driver) {
                'twilio' => new \App\Services\Sms\TwilioSmsDriver(),
                default => new \App\Services\Sms\LogSmsDriver(),
            };
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
