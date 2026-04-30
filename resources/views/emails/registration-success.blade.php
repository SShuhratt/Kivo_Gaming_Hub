<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration successful</title>
</head>
<body>
    <p>Hello! Registration successful.</p>

    <p>Hello{{ $user->name ? ' ' . $user->name : '' }},</p>

    <p>Your registration was successful.</p>

    <p>Welcome to {{ config('app.name') }}.</p>
</body>
</html>
