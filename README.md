# IOMoney

Offline expense manager built with Expo React Native.

## Features

- Local SQLite database, no backend required.
- Money Lover CSV import/export with the same columns:
  `ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report`
- IOMoney native CSV import/export for full-fidelity offline sync, including
  stable `uid`, `report_group`, `important`, timestamps, and `deleted_at`.
- Strict `dd/MM/yyyy` date validation to avoid Excel locale swaps.
- Dashboard by month with income, expense, net, and category breakdown.
- Search/filter transactions by month, category, and flow.
- Add, edit, delete, and long-press delete transactions.

## Run

Built on Expo SDK 54 for current Expo Go installs. Requires Node.js `>=20.19.4`.

```powershell
cd "C:\Users\acer\Documents\Code Base\iomoney"
npm install
npm run start
```

Then scan the Expo QR code with Expo Go, or press `a` for Android emulator.

## CSV Workflow

Use `IOMoney native CSV` for backup and app-to-app sync. It preserves every
field the app owns:

```text
schema_version, uid, external_id, note, amount, category, report_group, account, currency, date, event, exclude_report, important, created_at, updated_at, deleted_at
```

Use `Money Lover CSV` only for compatibility with Money Lover:

```text
ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report
```

Keep CSV dates as text in `dd/MM/yyyy` for both formats.

The Money Lover importer detects duplicate rows using:

```text
date + amount + note + category + account
```

The IOMoney native importer syncs rows by stable `uid` and keeps deleted rows
as `deleted_at` tombstones so deletions can be carried across CSV sync.

## Build

Use EAS when ready. `preview` creates an APK you can install directly on Android. `production` creates an AAB for Google Play.

```powershell
npm install -g eas-cli
eas login
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Local Android Release Notes

Local release builds can be much slower than EAS, especially on the first run.
EAS has a warmed Android environment and better cache; local Gradle has to
configure and compile native Android, Kotlin, CMake/NDK, and Expo modules on
this machine.

If local builds are unstable or hit OOM, keep the conservative Gradle settings:

```properties
org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m -Dfile.encoding=UTF-8
org.gradle.parallel=false
org.gradle.workers.max=2
```

If Windows pagefile is enabled again and the machine is stable, these can be
raised later for faster local builds. Build with:

```powershell
cd "C:\Users\acer\Documents\Code Base\iomoney\android"
.\gradlew assembleRelease --build-cache
```
