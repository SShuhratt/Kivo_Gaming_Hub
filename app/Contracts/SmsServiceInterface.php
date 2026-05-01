<?php

namespace App\Contracts;

interface SmsServiceInterface
{
    /**
     * Send an SMS message.
     *
     * @param string $phoneNumber The recipient's phone number.
     * @param string $message The content of the SMS.
     * @return void
     */
    public function send(string $phoneNumber, string $message): void;
}
