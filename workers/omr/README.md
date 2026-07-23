# OMR worker (AGPL boundary)

This separately published worker converts a private PDF into MusicXML with Audiveris, then normalizes it with `music21`. It receives only a short-lived job reference and never receives database credentials.

The Audiveris distribution is intentionally not vendored. Place an approved release under `vendor/audiveris-<version>` during the controlled image build. Run antivirus and PDF limits before dispatch. Outputs must be written to private storage and removed with the owning import.

Audiveris is AGPL-3.0. Distribution or network use must be reviewed by counsel, and the worker's complete corresponding source and build instructions must be offered with the deployed service.
