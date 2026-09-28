# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Screens

- **Main** (Squeege Squad Quote) – two large buttons: Create New Quote and View Prior Quote.
- **Prior Quotes** – saved quotes sorted by last name then address (quotes
  without a name go last), with a search box for name or address.
  Tap one to open its quote.
- **Contact** – first and last name, property address (street, suite no,
  city, state, zip), phone, email and notes. Laid out
  to fit on one phone screen without scrolling.
- **Services To Quote** – one button per service, in alphabetical order. Tapping
  a service opens its workflow; only Windows has one so far.
- **Window Details** – Window Service (Outside or Outside/Inside), Window
  Condition (New Construction, Heavy, Lite) and Cleaning Difficulty (Standard,
  High, Extreme – defaults to Standard).
- **Window Count** – XS–XL windows plus Screen and Skylight counters.
  **Add to Quote** puts the windows on the quote.
- **Quote** – invoice-style view: contact info at the top, one line item per
  service, total and notes. Tap a line item to change it; **Edit** jumps to
  Window Count. **Send Quote** builds a PDF of the quote and opens the phone's
  share sheet with it attached – pick Messages or Mail there. (Web apps can't
  open Mail/Messages with a file already attached, so the share sheet is the
  way to send an attachment.) Browsers that can't share files download the PDF
  and open a pre-filled email or text instead.

Every screen after Contact shows the customer's name and street under the
header; tap it to edit the contact info.

Every screen has a **Home** button at the top. Quotes are saved on the device (localStorage). Prices show as "TBD" until the
pricing rules are added in `priceFor()` in `app.js`.

PDFs are made with [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 (MIT),
kept in `vendor/` so it works with poor signal.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
