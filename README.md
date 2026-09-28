# Squigee Quote Tool

Mobile-first web app for window washing crews to build price quotes in the field.

## Screens

- **Main** (Squeegee Squad Quote) – two large buttons: Create New Quote and View Prior Quote.
- **Prior Quotes** – saved quotes sorted by last name then address (quotes
  without a name go last), with a search box for name or address. The trash
  icon deletes a quote (after confirming). **Export All Quotes** saves every
  quote as a CSV spreadsheet (contact info, answers, counts and total).
  Tap one to open its quote.
- **Contact** – first and last name, property address (street, suite no,
  city, state – prefilled as CA – and zip), phone (formatted as
  (408) 472-7924 while typing), email and notes. Laid out to fit on one phone
  screen without scrolling.
- **Services To Quote** – one button per service, in alphabetical order. Tapping
  a service opens its workflow; only Windows has one so far.
- **Window Details** – Window Service (Outside or Outside/Inside), Window
  Condition (New Construction, Heavy, Lite) and Cleaning Difficulty (Standard,
  High, Extreme – defaults to Standard).
- **Window Count** – XS–XL windows plus Screen and Skylight counters.
  **Add to Quote** puts the windows on the quote.
- **Quote** – laid out like the company's paper quote: logo and FREE ESTIMATE
  box (dated the day the quote was created), thank-you note, customer block, then per service a job box, line-item
  table (Qty, Description, Unit Price, Total) with discount, sub-total, tax and
  total, and the terms. Tap a line item or **Edit** to change it. Contact notes
  show below the quote but are not included when it is sent. **Send Quote**
  builds a matching PDF and opens the phone's share sheet with it attached –
  pick Messages or Mail there. (Web apps can't open Mail/Messages with a file
  already attached.) Browsers that can't share files download the PDF and open
  a pre-filled email or text instead.

Every screen after Contact shows the customer's name and street under the
header; tap it to edit the contact info.

Every screen has a **Home** button at the top. Quotes are stored by `store.js`: in the team's Google Sheet once
`COMPANY.quoteStore.url` is set (see below), otherwise on each phone.

## Prices

Unit prices come from the Google Sheet set in `company.js` (`priceSheet`). The
sheet must be shared as "Anyone with the link: Viewer". The app reads it each
time it opens (and when it comes back to the foreground) and keeps the last
prices on the phone, so quoting works without signal. Edits to the sheet show
up the next time the app opens.

Each service has its own tab (`priceSheet.tabs` maps service name to the tab's
`gid`). Columns are found by their header, so they can be in any order:

| Service | Windows | Dirty | Size | Standard | High | Extreme |
|---|---|---|---|---|---|---|
| Windows | Outside or Outside/Inside | New Construction, Lite or Heavy | XS, S, M, L, XL, Screen, Skylight | $11.00 | $11.55 | $12.10 |

The quote's Cleaning Difficulty picks the Standard, High or Extreme column. (A
tab with a single "Price" column uses that price for every difficulty.)

A line item shows "TBD" (and so does the total) when no row matches it. When a
quote is sent its prices are frozen, so later sheet edits don't change quotes
already sent.

Company details on the quote (name, phone, website, legal name, office
address, logo, thank-you note, terms, discount and tax rates) live in
`company.js`.

PDFs are made with [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 (MIT),
kept in `vendor/` so it works with poor signal.

## Quote sheet (shared storage for the team)

With the quote sheet set up, every phone saves quotes to one private Google
Sheet and Prior Quotes shows the whole team's quotes. Nothing about customers
is kept on the phone: a quote is held there only until the sheet confirms it's
saved (so a dead zone doesn't lose work), then removed. Quote numbers are
handed out by the sheet, so phones can't clash.

Each person enters their name and the team code once per phone. The name fills
in **Sent By** / **Quoted By** on their quotes.

### Setup (about 5 minutes, done once by the sheet owner)

1. Create a new Google Sheet, e.g. "Squeegee Squad Quotes". Keep it private
   (don't share it) – the script below reads and writes it for the app.
2. In the sheet: **Extensions → Apps Script**. Delete the sample code, paste
   in all of `apps-script/Code.gs`, and click **Save**.
3. Click **Project Settings** (gear icon) → **Script properties** → **Add
   script property**: name `TEAM_CODE`, value a code of your choosing (use
   something long, like 3–4 random words). Save.
4. Click **Deploy → New deployment**. Type: **Web app**. Execute as: **Me**.
   Who has access: **Anyone**. Click **Deploy**, allow the permissions Google
   asks for, and copy the **Web app URL**.
5. Put that URL in `company.js` under `quoteStore.url`.
6. Give the team code to the crew. On each phone, open the app and sign in.

"Anyone" means anyone can *reach* the script, but it refuses every request
without the team code. To lock someone out (e.g. a lost phone), change
`TEAM_CODE` – every phone will ask for the new code.

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New
version** so the URL stays the same.

## Running it

No build step or dependencies. Open `index.html` in a browser, or serve the
folder so phones on the same network can reach it:

```sh
python3 -m http.server 8000
```

Then visit `http://<your-computer-ip>:8000` on a phone.
