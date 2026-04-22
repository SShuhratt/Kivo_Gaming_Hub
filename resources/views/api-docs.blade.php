<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Kivo Hub API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
        <style>
            body {
                margin: 0;
                background: #0b1414;
            }

            #swagger-ui {
                max-width: 1200px;
                margin: 0 auto;
                padding: 24px;
            }
        </style>
    </head>
    <body>
        <div id="swagger-ui"></div>

        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
            window.onload = () => {
                window.SwaggerUIBundle({
                    url: @json($specUrl),
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    displayRequestDuration: true,
                    presets: [
                        window.SwaggerUIBundle.presets.apis,
                    ],
                });
            };
        </script>
    </body>
</html>
