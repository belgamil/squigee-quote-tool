// Company details printed on every quote (screen and PDF). Edit here.
const COMPANY = {
  name: "Squeegee Squad",
  legalName: "Fancy Schmancy LLC",
  website: "www.SqueegeeSquad.com",
  phone: "(650) 600-1414",
  email: "sanmateocounty@squeegeesquad.com",
  address: ["1320 Greenwood Avenue", "San Carlos, California 94070"],
  logo: "assets/logo.png",
  validFor: "GOOD FOR 90 DAYS",

  intro:
    "The confidence you have placed in us is appreciated. We stand behind our workmanship. If you see a mistake in our cleaning, we will happily come back and fix it for free. We strive to maintain the highest quality service at the best possible price. Your satisfaction is our goal. Contact us if you have comments or suggestions about our service. The highest compliment we are paid is the referral of your friends. Thank you!",

  terms: [
    "Lower window sill wipe down is complimentary. Deep cleaning window frames and tracks are not typically included. An additional charge may be added for such requests. If hard water stains are unnoticed at time of estimate, an additional fee may be added at the time of service per customer request to attempt restoration.",
    "Payment is due when work is completed. Local taxes may apply depending on location and service performed. A convenience fee may be added to credit card transactions depending on your local franchise policies.",
    "When performing window cleaning services, your screens will receive a complimentary wipe-down on both sides. When choosing outside only window cleaning, your screens will receive a wipe-down ONLY if your screens are located on the outside of the home.",
    "Extra Charges: May apply where there are unnoticed conditions (at time of quote) where there is smoke residue, excessive interior ladder work, exterior obstacles, excessive furniture moving, etc. You will be notified of any extra charges that may apply before you choose to continue work. These scenarios are rare.",
  ],

  // Google Sheet with the price list. It must be shared "Anyone with the link: Viewer".
  // `tabs` maps each service to its tab's gid (the number after "gid=" in the sheet's URL).
  priceSheet: {
    id: "1xG2txfC6VjP6hnK5yUzoQ2q-jl7ew-UHiUBWi5QvIiE",
    tabs: { Windows: "0" },
  },

  // Google Apps Script web app that stores quotes in the team's Google Sheet
  // (see apps-script/Code.gs). Leave empty to keep quotes on each phone instead.
  quoteStore: {
    url: "",
  },

  // Applied to every quote's subtotal. 0.1 = 10%.
  discountRate: 0,
  taxRate: 0,
};
