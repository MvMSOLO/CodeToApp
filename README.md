# CodeToApp

CodeToApp is a local-first code studio for HTML, JSON layouts, and Flutter-style widget trees.

## GitHub Actions

The **Android APK** workflow:
1. Builds the web workspace and runs TypeScript, unit, and auth-invariant checks.
2. Builds a dedicated Android web bundle from `android.html` and `src/android-entry.tsx`.
3. Generates a Capacitor Android wrapper in the runner, builds a debug APK, and uploads it as the `CodeToApp-debug-apk` artifact.

Open **Actions → Android APK → Run workflow** to trigger a build. After a successful run, open its **Artifacts** section and download `CodeToApp-debug-apk`. The APK artifact is retained for 14 days. The native `android/` directory is generated during CI rather than committed; the configuration and Android entry source are versioned in this repository.
