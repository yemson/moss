# Moss

This is an iOS-first [Expo](https://expo.dev) app.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Run the iOS app

   ```bash
   npm run ios
   ```

3. Start Metro when needed

   ```bash
   npm run start
   ```

The app targets iOS only. Android and web are not part of this project.

You can start developing by editing files in `src/app`, `src/components`, and `src/lib`.

## Development notes

- Run lint with `npm run lint`
- Native modules require an iOS dev build, not Expo Go
- The source of truth for subscription data is SQLite in `src/lib/subscription-store.ts`
