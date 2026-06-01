<?php

declare(strict_types=1);

namespace App\Providers;

use App\Mail\Transport\GmailApiTransport;
use App\Models\Service;
use App\Observers\ServiceObserver;
use Google\Client as GoogleClient;
use Google\Service\Gmail;
use Illuminate\Mail\MailManager;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Service::observe(ServiceObserver::class);

        $this->registerGmailApiDriver();
    }

    /**
     * Register the 'gmail_api' custom mail transport driver.
     *
     * Mail::extend() receives a $config array that Laravel populates from the
     * matching entry inside config/mail.php → 'mailers'. We ignore that array
     * here and pull credentials exclusively from config/services.php so that
     * secret values never have to live inside the mail config file.
     */
    private function registerGmailApiDriver(): void
    {
        /** @var MailManager $mailManager */
        $mailManager = $this->app->make('mail.manager');

        $mailManager->extend('gmail_api', function (array $config): GmailApiTransport {
            // Pull the three OAuth2 credentials from config/services.php → 'gmail'
            $clientId     = (string) config('services.gmail.client_id');
            $clientSecret = (string) config('services.gmail.client_secret');
            $refreshToken = (string) config('services.gmail.refresh_token');

            // Build and configure the Google API client
            $client = new GoogleClient();
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);

            // Supply the persisted refresh token so the client can mint a new
            // short-lived access token on every cold driver instantiation without
            // requiring interactive user consent again.
            $client->refreshToken($refreshToken);

            // Restrict the OAuth scope to only what is needed: sending mail.
            $client->setScopes([Gmail::GMAIL_SEND]);

            return new GmailApiTransport($client);
        });
    }
}
