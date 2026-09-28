# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Screens

1. **Contact** – first name, last name, property address, phone, email.
2. **Services To Quote** – tap any of Christmas Lights, Gutter, Solar, Windows.
3. **Window Details** – shown only when Windows is selected: Window Service
   (Outside or Outside/Inside) and New Construction (Yes or No).
4. **Window Count** – XS, S, M, L, XL window sizes plus extras (Screen,
   Skylight), each with large **−** / **+** buttons. The window total is shown
   at the top (screens and skylights are counted separately).

Everything entered is saved on the device, so a refresh doesn't lose it. The
phone's back button/gesture moves between screens.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
