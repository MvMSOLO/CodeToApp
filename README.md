# CodeToApp

CodeToApp source workspace.

## GitHub Actions

The workflow at `.github/workflows/android-apk.yml` validates the project, runs tests, builds the web app, and then builds a debug APK from an Android Gradle project at `android/`.

The supplied workspace archive currently needs to be committed in full, and an Android wrapper must be present under `android/` before APK packaging can pass. The workflow deliberately fails clearly if that wrapper is absent rather than claiming an APK was built.

To run it, open **Actions → Android APK → Run workflow** after the source and Android wrapper have been pushed.