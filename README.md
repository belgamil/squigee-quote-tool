# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Screens

- **Main** – two large buttons: Create New Quote and View Prior Quote.
- **Prior Quotes** – saved quotes sorted by last name, showing the address.
  Tap one to open its quote.
- **Contact** – first and last name (last name required), property address
  (street, suite no, city, state, zip), phone, email and notes.
- **Services To Quote** – one button per service, in alphabetical order. Tapping
  a service opens its workflow; only Windows has one so far.
- **Window Details** – Window Service (Outside or Outside/Inside) and New
  Construction (Yes or No).
- **Window Count** – XS–XL windows plus Screen and Skylight counters.
  **Add to Quote** puts the windows on the quote.
- **Quote** – invoice-style view: contact info at the top, one line item per
  service, total and notes. Tap a line item to change it, **Edit** to change
  contact info, **Add Service** for another service.

Quotes are saved on the device (localStorage). Prices show as "TBD" until the
pricing rules are added in `priceFor()` in `app.js`.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
