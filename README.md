# ROAS 5800 W1 Denoising Workbench

An interactive image-denoising UI for the W1 "Image Denoising" lecture and Course Assignment 1.

## Run

Open `index.html` in a browser. No build step or server is required.

Live page: <https://ellengong331.github.io/roas5800-denoising-workbench/>

After selecting a filter, use **Run selected** to apply it. Filter selection only changes the algorithm and its parameters.

© 2026 EllenGong331. All rights reserved. Original coursework; see
`LICENSE` and `ORIGINALITY_DECLARATION.md`.

## Included Filters

- Gaussian filter
- Bilateral filter
- Non-local means (NLM)

## Workflow

The UI starts with a generated room demo. Users can switch to a city demo or upload their own image, add Gaussian or salt-and-pepper noise, choose a filter, adjust its parameters, and compare the reference, noisy, and restored images. The Metrics view shows PSNR, RMSE, runtime, and a luminance histogram.

For a focused comparison, start with Gaussian, Bilateral, and NLM. After each run, use **Export image** and **Export metrics** to save the restored PNG and a JSON record of the noise settings, algorithm parameters, PSNR, RMSE, and runtime.

## Files

- `index.html` - layout and controls
- `styles.css` - responsive styling
- `app.js` - demo image generation, noise synthesis, denoising algorithms, and metrics
- `README.md` - project summary
