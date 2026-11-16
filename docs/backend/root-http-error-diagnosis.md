# Backend root-route HTTP 500 diagnosis

## Confirmed cause

GET / has no controller or index resource. Spring 6.2.3 falls back to ResourceHttpRequestHandler.handleRequest(), which throws NoResourceFoundException at line 585. GlobalExceptionHandler.handleGeneralException(Exception,HttpServletRequest) was catching that normal missing-resource condition and replacing its 404 with INTERNAL_SERVER_ERROR/500. GET /api/v1 and unknown routes had the same problem. Health and format APIs already returned 200.

The pre-fix real-HTTP Spring Boot regression log captures the exception, stack trace and handler selection in backend/target/root-error-before.log. The old user-owned terminal output was not attached; the equivalent failure was reproduced in the controlled server.

## Process diagnosis

Port 8081 initially belonged to PID 3260, C:\Program Files\Java\jdk-22\bin\java.exe, main class com.mediaforge.backend.MediaForgeApplication. jcmd confirmed its working directory was this project's backend folder. It started at 17:52:19 +05:30 through Maven spring-boot:run, from a VS Code PowerShell terminal. Two Maven launcher processes in the ancestry were launcher/wrapper processes, not two application instances. Other Java processes were IDE/Android tooling and were left untouched.

The previous termination cannot be reconstructed without the old PID/terminal history. A continuing HTTP response means a server is listening again; restarting unchanged code reproduces this application bug. No project DevTools dependency, IDE launch configuration or restart watcher was found. There is no evidence that an automatic IDE restart caused it.

After the fix passed focused tests, only the verified application PID 3260 was stopped. The existing Maven wrapper launched the fixed application in the background; PID 36292 listens on 8081, from the same expected working directory. Logs are backend/target/root-error-runtime.log and root-error-runtime-stderr.log.

## Implementation

GlobalExceptionHandler now extends Spring's ResponseEntityExceptionHandler. Framework HTTP errors retain their status and protocol headers (including Allow on 405), while responses use the existing ApiErrorResponse JSON schema. Bean validation keeps VALIDATION_FAILED and field errors. Framework errors suppress private exception details. Unexpected application exceptions still return a generic 500 and log their full stack trace. No fake root 200 endpoint was added; the health endpoint remains /api/v1/health.

Modified code: backend/src/main/java/com/mediaforge/backend/exception/GlobalExceptionHandler.java and backend/src/test/java/com/mediaforge/backend/controller/HttpErrorHandlingIntegrationTest.java. This report and its JSON evidence are the other added files. No Flutter, Next.js, database or port configuration changes were made for this fix.

## Executed verification

- Pre-fix: real GET /, /api/v1 and unknown route returned 500. A failing regression reproduced the exact stack.
- Eleven new regression cases pass, using a real embedded server on an isolated random test port plus the NoHandlerFoundException handler variant. Production remains on 8081.
- GET /, /api/v1 and unknown paths now return 404/RESOURCE_NOT_FOUND.
- Health, actuator health and conversion format endpoints return 200.
- Invalid bean validation, malformed JSON and invalid UUID return 400; wrong method returns 405 with Allow; unsupported media type returns 415.
- A test-only controller verifies unexpected application errors remain 500, stack traces are logged, and details are not exposed. It is not a production endpoint.
- Android Emulator emulator-5554 made real socket requests to 10.0.2.2:8081: root returned 404; /api/v1/health returned 200/UP. This proves backend reachability, not a claim about the mobile app's separate HTTPS downloader configuration.

## Remaining test limitation

The full Maven suite was executed twice. The final run reports 178 tests: 160 passed, 17 skipped, one failed. Both runs hit Windows CreateProcess error=5 (Access is denied) when an existing downloader transport fixture tried to start a child Java executable. The first run failed the rate-limit classification fixture; the final run failed the timeout fixture. Each failed case passed when rerun alone. No downloader production code or test expectations were changed to hide these failures. The full suite is therefore not claimed green. Detailed results, skipped classes, HTTP responses and process evidence are in root-http-error-verification.json.

## Manual checks

Open http://localhost:8081/ and expect JSON status 404 with code RESOURCE_NOT_FOUND. Open http://localhost:8081/api/v1/health and expect 200/UP. Use http://10.0.2.2:8081/api/v1/health from the Android Emulator. To launch after stopping the current instance, run .\mvnw.cmd spring-boot:run from backend; do not launch a duplicate on an occupied port.
