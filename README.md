# ROAS 5800 W1 Denoising Workbench

An interactive image-denoising UI for the W1 "Image Denoising" lecture and Course Assignment 1.

## Run

Open `index.html` in a browser. No build step or server is required.

Live page: <https://ellengong331.github.io/roas5800-denoising-workbench/>

© 2026 EllenGong331. All rights reserved. Original coursework; see
`LICENSE` and `ORIGINALITY_DECLARATION.md`.

## Included Filters

- Mean filter
- Gaussian filter
- Median filter
- Bilateral filter
- Non-local means (NLM)

## Workflow

The UI starts with a generated room demo. Users can switch to a city demo or upload their own image, add Gaussian or salt-and-pepper noise, choose a filter, adjust its parameters, and compare the reference, noisy, and restored images. The Metrics view shows PSNR, RMSE, runtime, and a luminance histogram.

## Files

- `index.html` - layout and controls
- `styles.css` - responsive styling
- `app.js` - demo image generation, noise synthesis, denoising algorithms, and metrics
- `README.md` - project summary
