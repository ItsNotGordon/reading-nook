This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run all commands from this **`app`** directory (where `package.json` lives).

### Live book search

The **Add** tab searches books via [Open Library](https://openlibrary.org/) through the server route `/api/books/search`. No API key is required.

### Legacy static catalog (recommendations pipeline)

`npm run build:books` still generates `public/data/books.json` from Goodbooks CSVs for the offline recommender and related tooling. Add-tab **search** does not use that file.

```bash
npm run build:books
npm run build:recs   # optional: refresh recommendations.json
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

For production:

```bash
npm run build
npm start
```

You can start editing routes under `src/app/`. The page auto-updates as you save files.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
