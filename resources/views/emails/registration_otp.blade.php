<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your verification code</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
    <h1 style="margin-bottom: 16px;">{{ config('app.name') }}</h1>
    <p>Your verification code is:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; display: inline-block; padding: 12px 18px; border-radius: 8px;">
        {{ $otp }}
    </p>
    <p>This code expires in {{ $expiresInMinutes }} minutes.</p>
    <p>Enter this code in the app to complete your registration.</p>
</body>
</html>
