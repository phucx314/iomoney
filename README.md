# IOMoney

Offline expense manager built with Expo React Native.

## Features

- Local SQLite database, no backend required.
- Money Lover CSV import/export with the same columns:
  `ID, Note, Amount, Category, Account, Currency, Date, Event, Exclude Report`
- Strict `dd/MM/yyyy` date validation to avoid Excel locale swaps.
- Dashboard by month with income, expense, net, and category breakdown.
- Search/filter transactions by month, category, and flow.
- Add, edit, delete, and long-press delete transactions.

## Run

Built on Expo SDK 54 for current Expo Go installs. Requires Node.js `>=20.19.4`.

```powershell
cd "C:\Users\acer\Documents\Code Base\iomoney\raw-data\iomoney-app"
npm install
npm run start
```

Then scan the Expo QR code with Expo Go, or press `a` for Android emulator.

## CSV Workflow

1. Keep CSV dates as text in `dd/MM/yyyy`.
2. In the app, open `Sync`.
3. Tap `Import CSV`.
4. Pick `MoneyLover-2026-07-09.csv` or another compatible CSV.
5. Edit locally.
6. Tap `Export CSV` to share/save a fresh CSV.

The importer skips duplicate rows using:

```text
date + amount + note + category + account
```

## Build

Use EAS when ready. `preview` creates an APK you can install directly on Android. `production` creates an AAB for Google Play.

```powershell
npm install -g eas-cli
eas login
eas build --platform android --profile preview
eas build --platform android --profile production
```
