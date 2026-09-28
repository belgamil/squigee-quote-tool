# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Screens

- **Main** (Squeegee Squad Quote) – two large buttons: Create New Quote and View Prior Quote.
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
- **Quote** – laid out like the company's paper quote: logo and FREE ESTIMATE
  box, thank-you note, customer block, then per service a job box, line-item
  table (Qty, Description, Unit Price, Total) with discount, sub-total, tax and
  total, and the terms. Tap a line item or **Edit** to change it. Contact notes
  show below the quote but are not included when it is sent. **Send Quote**
  builds a matching PDF and opens the phone's share sheet with it attached –
  pick Messages or Mail there. (Web apps can't open Mail/Messages with a file
  already attached.) Browsers that can't share files download the PDF and open
  a pre-filled email or text instead.

Every screen after Contact shows the customer's name and street under the
header; tap it to edit the contact info.

Every screen has a **Home** button at the top. Quotes are saved on the device (localStorage). Prices show as "TBD" until the
pricing rules are added in `unitPrice()` in `app.js`.

Company details on the quote (name, phone, website, legal name, office
address, logo, thank-you note, terms, discount and tax rates) live in
`company.js`.

PDFs are made with [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 (MIT),
kept in `vendor/` so it works with poor signal.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
