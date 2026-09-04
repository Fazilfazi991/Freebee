# Error monitoring policy

No monitoring vendor is connected. A future provider may receive only app version, route, tool slug, generic exception type, generic error code, browser family/version and coarse operating-system class.

Never report uploaded content, filenames, paths, JWTs, passwords, hashes, invoice/customer fields, OCR text, CSV/JSON contents, URLs entered into tools, canvas/signature data, generated files, clipboard contents, API keys, access tokens or raw exception messages that may contain user data.

Before activation: implement an allowlist at the reporting boundary, redact URLs/query strings and stack arguments, sample high-volume events, define retention/access controls, update privacy/consent materials, test opt-out behavior and document the provider/subprocessor.
