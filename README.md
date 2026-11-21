# Body Data

A React + TypeScript dashboard for body measurements and proportions. Built with Vite and Recharts. Deploys as a static site on GitHub Pages; no backend, API keys, or database needed.

## Run locally

Use Node.js 24 LTS (Node 22.12+ also works). An `.nvmrc` is included for `nvm use`.

```sh
npm install
npm run dev
```

Open the local URL Vite prints. Commit the generated `package-lock.json` so local development and GitHub builds use the same dependency versions. The deployment workflow uses `npm ci` when the lockfile exists and `npm install` for the first deployment if it does not.

```sh
npm test
npm run build
npm run preview
```

The calculation and CSV validation tests use Node's built-in test runner and can run before installing dependencies. The production build runs the full TypeScript check.

## What's included

- Eight measurement summaries with sparklines and total changes.
- Interactive trends in actual units or percentage change from baseline.
- Date range selection and check-in change heatmap.
- Favorite ratios and a numerator/denominator explorer with underlying measurements.
- All 28 circumference and height pairings in a clickable matrix.
- Comparison of any two dates, including percentage changes and rates per week.
- Measurement log and CSV export.
- Responsive layout for desktop and mobile.
- Date-controlled body illustration with a timeline slider and an optional first-check-in outline.

## Update measurements

Edit `data/measurements.csv` and append a row:

```csv
Date,Weight (lb),Waist at navel (in),Shoulders (in),Right arm (in),Right forearm (in),Right quad (in),Right calf (in),Glutes (in)
2026-11-21,196.0,35.75,51.0,15.75,12.25,24.0,14.1,41.75
```

Keep the column names, use `YYYY-MM-DD`, and leave unknown measurements blank. Keep commas for empty cells, including a trailing comma when the last measurement is missing. CSV and tab-separated input are supported. Entries are sorted by date. Duplicate dates, invalid dates, nonpositive measurements, malformed rows, and empty measurement rows fail validation with a readable message.

Commit and push to `main`; the included GitHub Actions workflow tests, builds, and deploys the site. The CSV is bundled into each build, so the deployed URL has the same data on every device. Measurement edits are made in the repository rather than the browser. An already open dashboard needs a refresh after deployment to show new data.

## Height

Height is fixed at **70 inches** in `src/model.ts`. All height-based ratios use this value on every device.

## Body illustration

The overview includes a stylized front-view man. Choose a check-in date or move the timeline slider to change the figure and its measurement readout. The figure respects the overview date range. Select a measurement beside the figure to highlight its location. A continuous silhouette, soft contour shading, and fixed anatomical landmarks make changes easier to see. An optional dashed outline compares with the first check-in in that range, at the same height and scale.

This is an illustration of measurement changes, not an exact reconstruction. Front-view widths cannot be recovered uniquely from circumferences. The torso uses a fixed elliptical cross-section assumption (depth/width 0.5 for shoulders and 0.7 for waist and hips); limbs use circular cross-sections. Pose, segment lengths, head, neck, hands, and feet are assumed and held consistent. Right-side limb measurements are mirrored to the left. Weight does not drive the shape.

Missing measurements stay missing in readouts, ratios, and charts. The illustration alone uses estimated widths for unmeasured regions and identifies them below the drawing. It does not borrow measurements from another date. Missing glute circumference is estimated from the current waist; other missing regions use fixed height-based defaults. No inferred body fat, muscle definition, or photographic likeness is shown.

## GitHub Pages setup

1. Create an **empty GitHub repository**, for example `body-data`. Do not initialize it with a README, license, or `.gitignore`; those files can be added here.
2. In the repository, go to **Settings → Pages → Build and deployment → Source**, and choose **GitHub Actions**. If Pages is unavailable until the first push, do this immediately after pushing, then rerun the deployment.
3. Keep GitHub Actions enabled. If repository policy restricts actions, allow `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. The workflow requests its own Pages and OIDC permissions; no personal access token or repository secret is required for deployment.
4. Push this directory to the repository's `main` branch:

```sh
git init -b main
git add .
git commit -m "Build measurement and proportions dashboard"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

5. Open the repository's **Actions** tab and watch **Deploy dashboard to GitHub Pages**. The deployment job reports the live URL, usually `https://YOUR_USERNAME.github.io/YOUR_REPO/`.

No repository name or username is hardcoded in the application. Vite uses relative asset paths so project URLs and custom domains both work. The app uses in-page navigation, so no special route fallback is needed.

The site and the measurements bundled into it are public on standard GitHub Pages. GitHub Free supports Pages from public repositories; private source repositories require an eligible paid plan and do not make a standard Pages site private. See [GitHub's Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Calculation details

- Measurements are stored in pounds and inches; circumference-to-circumference and height ratios are dimensionless.
- Missing values stay missing. Charts leave gaps instead of interpolating unknown values.
- Measurement summaries compare the first and last available values in the selected range and show a narrower date window when needed.
- Ratio changes use the first and last dates where **both** values are available. No mixing values from different check-ins.
- Percentage change is `(last / first - 1) × 100`. Each normalized trend uses its own first available baseline.
- Rates per week use the actual number of elapsed days, not row counts. A single observation has no weekly rate.
- The check-in heatmap compares adjacent entries in the selected range. These are percentage changes per check-in, not weekly rates.
- Blue and green distinguish change direction without assigning a favorable or unfavorable meaning.
- A rising ratio can result from a smaller denominator. Circumferences and ratios alone do not establish muscle gain, fat loss, or body fat percentage.

## Project layout

```text
data/measurements.csv          Measurement history; edit this weekly
src/App.tsx                   Dashboard screens and interactions
src/model.ts                  CSV validation and calculation functions
src/model.test.ts             Calculation and real-data validation tests
src/BodyFigure.tsx            Date-controlled SVG illustration and readouts
src/bodyShape.ts              Consistent circumference-to-width drawing model
src/bodyShape.test.ts         Drawing behavior and missing-data checks
src/styles.css                Responsive dashboard styles
.github/workflows/deploy.yml  Automatic test, build, and Pages deployment
```
