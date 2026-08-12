@echo off
echo Building mhlove-truncate (Rust)...
cargo build --release
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)
echo Copying executable to project root...
copy /Y target\release\mhlove-truncate.exe ..\mhlove-truncate.exe
echo Done.
