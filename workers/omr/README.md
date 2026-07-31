# OMR worker (AGPL boundary)

This separately published worker converts a private PDF into MusicXML with Audiveris, then normalizes it with `music21`. It receives only a short-lived signed source URL and never receives database credentials.

The image downloads the official Audiveris 5.10.2 Ubuntu package plus the pinned Tesseract `eng` and `por` legacy models required by Audiveris. Every downloaded artifact is checked by SHA-256. The worker validates the PDF signature, encryption, 20 MB size, 20-page limit and source host before invoking Audiveris.

The service exposes only `GET /health` and `POST /process`. Configure `WORKER_ALLOWED_HOSTS` with the API/storage hosts that may issue signed URLs. Do not expose port 8090 publicly.

Audiveris is AGPL-3.0. Distribution or network use must be reviewed by counsel, and the worker's complete corresponding source and build instructions must be offered with the deployed service.

## Defensive PDF processing

The worker validates page content and estimates the 300-DPI raster size before
starting Audiveris. Pages with abnormal geometry are proportionally normalized
to A4 or Letter; truly blank pages are removed. If direct recognition fails
because the renderer cannot decode the source, a bounded grayscale PDF is
tried once. MXL archives and generated MusicXML are structurally validated
before normalization.

Deterministic input errors are returned with stable codes and are not retried
by the API. Transient process and network errors retain bounded retries. The
response includes a sanitized preprocessing summary for draft provenance and
support diagnostics.

## Development reload

The Dockerfile exposes a production `runtime` target and a local `dev` target.
Compose uses `dev`, mounts this directory read-only at `/app`, and restarts the
HTTP process only when `server.py`, `pipeline.py`, or `normalize.py` changes.
Audiveris and OCR models remain installed in the image. Dependency or image
changes still require `npm run stack:rebuild`.

## Private Nivaldo regression

`Nivaldo_no_choro.pdf` is deliberately excluded from Git. Run the complete real-worker and API regression with:

```sh
NIVALDO_NO_CHORO_PDF=/absolute/path/Nivaldo_no_choro.pdf npm run test:corpus:nivaldo
```

The command mounts the PDF read-only into a temporary worker container, checks the expected edition, runs Audiveris, validates non-reconstructive musical checkpoints, tests review corrections and verifies the generated sequence and melody. Normalized MusicXML and a sanitized report are retained in a temporary directory only when the test fails.

The optional CI job uses the repository secrets `NIVALDO_CORPUS_URL` and `NIVALDO_CORPUS_SHA256`. The URL must point to private short-lived storage; the PDF is removed with the hosted runner.

For the browser journey, start the frontend on port 5173 and the backend profile, then run:

```sh
NIVALDO_NO_CHORO_PDF=/absolute/path/Nivaldo_no_choro.pdf npm run test:e2e:nivaldo
```

The same real-worker regression can be run for the private Choro Negro fixture:

```sh
CHORO_NEGRO_PDF=/absolute/path/Choro_Negro.pdf npm run test:corpus:choro
```
