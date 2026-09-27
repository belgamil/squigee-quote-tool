# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Current screen: Window Count

Five size categories (XS, S, M, L, XL), each with large **−** / **+** buttons to
adjust the count. A running total is shown at the top, counts are saved on the
device (so a refresh doesn't lose them), and **Reset** clears everything.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
