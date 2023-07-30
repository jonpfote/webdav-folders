# Change Log

## 0.0.4 New secret option on 2023-07-30
- New: Add option 'watchTimeout'. This will ask the server every X seconds for file changes. You most definitely should NOT use it, as the include list/ exclude list in the vscode settings are IGNORED and some files might not be watched at all.

## 0.0.3 Fix on 2023-07-28
- Fix: Multiple Error messages were shown on an 403 error from the server on saving the file.

## Initial release

- Initial release