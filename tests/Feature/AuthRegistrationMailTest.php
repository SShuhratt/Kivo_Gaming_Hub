<?php

namespace Tests\Feature;

use App\Mail\PasswordResetOtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthRegistrationMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_succeeds_instantly_without_otp_and_allows_login(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'User3',
            'email' => 'user3@gmail.com',
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', "Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi.")
            ->assertJsonPath('email', 'user3@gmail.com')
            ->assertJsonPath('requires_verification', false);

        $user = User::where('gmail', 'user3@gmail.com')->firstOrFail();

        $this->assertNotNull($user->email_verified_at);
        $this->assertNull($user->otp_purpose);

        // Can login instantly
        $this->postJson('/api/auth/login', [
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ])->assertOk();
    }

    public function test_password_reset_uses_email_otp_and_updates_the_password(): void
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Reset User',
            'gmail' => 'reset.user@gmail.com',
            'phone_number' => '+998901234500',
            'password_hash' => Hash::make('OldPassword1!'),
            'email_verified_at' => now(),
        ]);

        $this->postJson('/api/auth/forgot-password/send-otp', [
            'email' => $user->gmail,
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset OTP sent to your email.');

        $otp = $this->latestOtpFromSentMail(PasswordResetOtpMail::class, $user->gmail);

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => $user->gmail,
            'otp' => '654321',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Invalid OTP.');

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => $user->gmail,
            'otp' => $otp,
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset OTP verified successfully.');

        $this->postJson('/api/auth/forgot-password/reset', [
            'email' => $user->gmail,
            'otp' => $otp,
            'password' => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk()
            ->assertJsonPath('message', 'Password reset successfully.');

        $user->refresh();

        $this->assertTrue(Hash::check('NewPassword1!', $user->password_hash));
        $this->assertNull($user->otp_code_hash);
        $this->assertNull($user->otp_purpose);

        $this->postJson('/api/auth/login', [
            'phone_number' => $user->phone_number,
            'password' => 'OldPassword1!',
        ])->assertStatus(401);

        $this->postJson('/api/auth/login', [
            'phone_number' => $user->phone_number,
            'password' => 'NewPassword1!',
        ])->assertOk();

        $this->postJson('/api/auth/forgot-password/reset', [
            'email' => $user->gmail,
            'otp' => $otp,
            'password' => 'AnotherPass1!',
            'password_confirmation' => 'AnotherPass1!',
        ])->assertStatus(422);
    }

    public function test_send_forgot_password_otp_succeeds_with_fallback_for_test_users_if_email_fails(): void
    {
        // 1. Create a verified test user
        $user = User::create([
            'name' => 'Forgot Fallback User',
            'gmail' => 'fallback-forgot@test.com',
            'phone_number' => '+998777777999',
            'password_hash' => Hash::make('User$H123'),
            'email_verified_at' => now(),
        ]);

        // 2. Mock Mail to throw exception
        Mail::shouldReceive('to')
            ->once()
            ->andThrow(new \RuntimeException('SMTP failed'));

        $response = $this->postJson('/api/auth/forgot-password/send-otp', [
            'email' => 'fallback-forgot@test.com',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Password reset OTP sent to your email.')
            ->assertJsonPath('email', 'fallback-forgot@test.com')
            ->assertJsonStructure(['debug_otp']);

        $debugOtp = $response->json('debug_otp');
        $this->assertNotEmpty($debugOtp);

        $this->postJson('/api/auth/forgot-password/verify-otp', [
            'email' => 'fallback-forgot@test.com',
            'otp' => $debugOtp,
        ])->assertOk();
    }

    protected function latestOtpFromSentMail(string $mailableClass, string $email): string
    {
        $sentMail = collect(Mail::sent($mailableClass))
            ->filter(fn (object $mail) => $mail->hasTo($email))
            ->last();

        $this->assertNotNull($sentMail, "Expected {$mailableClass} to be sent to {$email}.");

        return $sentMail->otp;
    }
}
