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
                background: #fafafa; /* Light background */
                font-family: sans-serif;
            }

            #swagger-ui {
                max-width: 1100px;
                margin: 20px auto;
                background: #ffffff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border-radius: 8px;
                padding: 10px;
            }

            /* Ensure input text is always visible (black) */
            .swagger-ui input[type=text], 
            .swagger-ui textarea {
                color: #333 !important;
                background: #fff !important;
                border: 1px solid #ccc !important;
            }

            /* Improve readability of the 'Try it out' button */
            .swagger-ui .btn.try-out__btn {
                background-color: #4990e2;
                color: white;
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
