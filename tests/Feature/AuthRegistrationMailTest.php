<?php

namespace Tests\Feature;

use App\Mail\WelcomeRegistrationMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthRegistrationMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_success_email_and_keeps_response_shape(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'gmail' => 'test-user@example.test',
            'phone_number' => '+998 90 123 45 67',
            'password' => 'secret123',
        ]);

        $response
            ->assertCreated()
            ->assertExactJson(['message' => 'User registered successfully']);

        $this->assertDatabaseHas('users', [
            'gmail' => 'test-user@example.test',
            'phone_number' => '+998901234567',
        ]);

        Mail::assertSent(WelcomeRegistrationMail::class, function (WelcomeRegistrationMail $mail) {
            return $mail->user->gmail === 'test-user@example.test';
        });
    }

    public function test_registration_still_succeeds_when_welcome_email_fails(): void
    {
        Log::spy();
        Mail::shouldReceive('to')
            ->once()
            ->with('broken-mail@example.test')
            ->andReturn(new class
            {
                public function send(object $mailable): void
                {
                    throw new \RuntimeException('SMTP unavailable');
                }
            });

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Broken Mail User',
            'gmail' => 'broken-mail@example.test',
            'phone_number' => '+998 91 111 22 33',
            'password' => 'secret123',
        ]);

        $response
            ->assertCreated()
            ->assertExactJson(['message' => 'User registered successfully']);

        $this->assertDatabaseHas('users', [
            'gmail' => 'broken-mail@example.test',
            'phone_number' => '+998911112233',
        ]);

        Log::shouldHaveReceived('error')
            ->once()
            ->with('Failed to send registration email', \Mockery::on(function (array $context) {
                return $context['email'] === 'broken-mail@example.test'
                    && $context['error'] === 'SMTP unavailable'
                    && $context['user_id'] !== null;
            }));
    }

    public function test_registered_user_can_login_with_or_without_a_plus_sign_in_phone_number(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', [
            'name' => 'Phone Format User',
            'gmail' => 'phone-format-user@example.test',
            'phone_number' => '+998 90 777 66 55',
            'password' => 'secret123',
        ])->assertCreated();

        $this->postJson('/api/auth/login', [
            'phone_number' => '998907776655',
            'password' => 'secret123',
        ])->assertOk()
            ->assertJsonStructure([
                'token_type',
                'token',
                'expires_in',
                'user' => ['id', 'name', 'gmail', 'phone_number'],
            ])
            ->assertJsonPath('user.phone_number', '+998907776655');
    }
}
