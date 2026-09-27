# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Current screen: Window Count

Five window sizes (XS, S, M, L, XL) plus extras (Screen, Skylight), each with
large **−** / **+** buttons to adjust the count. The window total is shown at
the top (screens and skylights are counted separately), counts are saved on the
device (so a refresh doesn't lose them), and **Reset** clears everything.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
