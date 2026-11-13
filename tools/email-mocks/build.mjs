// Builds docs/mocks/emails/ from the e-mail layout the backend embeds
// (backend/src/Jubilee.Application/Emails/EmailLayout.html), so a mock and the e-mail that is
// sent cannot drift in layout. The rules that turn the text into HTML mirror EmailLayout.cs.
// Run: node tools/email-mocks/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const layout = readFileSync(
  join(root, 'backend/src/Jubilee.Application/Emails/EmailLayout.html'),
  'utf8',
).replace(/\r\n/g, '\n');
const out = join(root, 'docs/mocks/emails');
const base = 'https://app.jubilee.to';
const signature = "Jubilee · Toronto's Christian marketplace";
const token = 'k3Jv9QmX2rT7bN4wZ8cP1sY6dH5fL0aG';

const labels = [
  ['/verify-email/', 'Confirm your e-mail'],
  ['/confirm-email-change/', 'Confirm your new e-mail'],
  ['/reset-password/', 'Choose a new password'],
  ['/forgot-password', 'Reset your password'],
  ['/account/data/', 'Download your data'],
  ['/sign-in', 'Sign in to Jubilee'],
];

const encode = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const isLink = (p) => /^https?:\/\/\S+$/.test(p);
const paragraphStyle = 'margin:0 0 16px;font-size:16px;line-height:24px;color:#0b0e14;';

function paragraph(text) {
  const html = encode(text).replace(/https?:\/\/[^\s<]+/g, (match) => {
    const link = match.replace(/[.,;:)]+$/, '');
    return `<a class="jb-mail__link" href="${link}" style="color:#006644;">${link}</a>${match.slice(link.length)}`;
  });
  return `            <p class="jb-mail__text" style="${paragraphStyle}">${html.replace(/\n/g, '<br>')}</p>\n`;
}

function button(link, label) {
  const href = encode(link);
  return (
    '            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;"><tr><td style="border-radius:8px;background-color:#ffb81c;">' +
    `<a class="jb-mail__button" href="${href}" style="display:inline-block;padding:12px 24px;border:1px solid #b87f00;border-radius:8px;font-size:16px;line-height:24px;font-weight:600;color:#0b0e14;text-decoration:none;text-align:center;">${encode(label)}</a>` +
    '</td></tr></table>\n' +
    `            <p class="jb-mail__muted" style="margin:0 0 16px;font-size:13px;line-height:20px;color:#4a505c;word-break:break-all;">If the button doesn’t work, paste this link into your browser:<br><a class="jb-mail__link" href="${href}" style="color:#006644;">${href}</a></p>\n`
  );
}

function render(subject, text, unsubscribe, address) {
  const paragraphs = text
    .split('\n\n')
    .map((p) => p.replace(signature, '').trim())
    .filter((p) => p.length > 0);
  let content = '';
  for (const p of paragraphs) {
    if (isLink(p)) {
      const path = new URL(p).pathname;
      content += button(p, labels.find(([start]) => path.startsWith(start))?.[1] ?? 'Open Jubilee');
      continue;
    }
    const lines = p.split('\n');
    const named = /^([^:\n]{2,60}): (https?:\/\/\S+)$/.exec(lines[lines.length - 1]);
    if (!named) {
      content += paragraph(p);
      continue;
    }
    if (lines.length > 1) content += paragraph(lines.slice(0, -1).join('\n'));
    content += button(named[2], named[1]);
  }
  const preheader =
    paragraphs.find((p) => !isLink(p) && !p.startsWith('Hi ') && !p.startsWith('Hello')) ?? subject;
  const footer = unsubscribe
    ? `            <p class="jb-mail__muted" style="margin:8px 0 0;font-size:13px;line-height:20px;color:#4a505c;">You get this e-mail because of your notification settings. <a class="jb-mail__link" href="${encode(unsubscribe)}" style="color:#006644;">Unsubscribe from e-mails like this</a>.</p>\n`
    : '';
  const sender = address
    ? `            <p class="jb-mail__muted" style="margin:8px 0 0;font-size:13px;line-height:20px;color:#4a505c;">Jubilee, ${encode(address)}</p>\n`
    : '';
  return layout
    .replace('{{subject}}', encode(subject))
    .replace('{{preheader}}', encode(preheader.replace(/\n/g, ' ')))
    .replace('{{content}}\n', content)
    .replace('{{footer}}\n', footer + sender);
}

/** The dark rendition: what a mail client that honours prefers-color-scheme shows. */
const dark = (html) => html.replace('@media (prefers-color-scheme: dark)', '@media all');

const end = `\n\n${signature}\n`;
// The footer link opens the unsubscribe page (L2-224); the List-Unsubscribe header keeps the API address.
const unsubscribe = `${base}/unsubscribe/${token}`;
// Promotional e-mail names Jubilee's mailing address (L2-149 AC1); production sets Email:MailingAddress.
const address = '1 Example Street, Toronto, ON M5H 0A1';
/** What EmailLayout adds to the plain-text part of a promotional e-mail. */
const promotional = (text) => `${text.trimEnd()}\nUnsubscribe: ${unsubscribe}\nJubilee, ${address}\n`;
const emails = [
  ['confirm-email', 'Confirm your e-mail for Jubilee', `Hi Joanna,\n\nConfirm your e-mail to message businesses and book meetings on Jubilee. Open this link within 24 hours:\n\n${base}/verify-email/${token}\n\nIf you didn't join Jubilee, ignore this e-mail.${end}`],
  ['address-in-use', 'Someone tried to join Jubilee with your e-mail', `Hi Joanna,\n\nSomeone tried to create a Jubilee account with your address. Your account is unchanged. If that was you, sign in at ${base}/sign-in.${end}`],
  ['confirm-new-email', 'Confirm your new e-mail for Jubilee', `Hi Joanna,\n\nConfirm this address to use it for your Jubilee account. Open this link within 24 hours:\n\n${base}/confirm-email-change/${token}\n\nIf you didn't ask for this, ignore this e-mail. Nothing changes until the link is opened.${end}`],
  ['email-change-requested', 'A Jubilee e-mail change was requested', `Hi Joanna,\n\nSomeone asked to change the e-mail of your Jubilee account to joanna@adeyemi.example. Your address stays joanna.adeyemi@example.com until the link sent to the new address is opened.\n\nIf it wasn't you, change your password right away.${end}`],
  ['reset-password', 'Reset your Jubilee password', `Hi Joanna,\n\nSomeone asked to reset the password of your Jubilee account. Open this link within 60 minutes to choose a new one. It works once:\n\n${base}/reset-password/${token}\n\nIf it wasn't you, ignore this e-mail. Your password stays as it is.${end}`],
  ['password-changed', 'Your Jubilee password was changed', `Hi Joanna,\n\nThe password of your Jubilee account was just changed, and every other device was signed out. If that was you, there is nothing to do.\n\nIf it wasn't you, reset your password again right away and write to us.${end}`],
  ['sign-in-blocked', 'Sign-in to Jubilee was blocked', `Hi Joanna,\n\nWe blocked sign-in to your Jubilee account for 15 minutes after repeated failed attempts. If that was you, wait and try again. If it was not, reset your password: ${base}/forgot-password${end}`],
  ['data-ready', 'Your Jubilee data is ready to download', `Hi Joanna,\n\nYou asked for a copy of your data. Open this link, signed in to your account, within 7 days to download it as a JSON file:\n\n${base}/account/data/${token}\n\nIf it wasn't you, you can ignore this e-mail. The file is deleted after 7 days.${end}`],
  ['account-deleted', 'Your Jubilee account was deleted', `Hi Joanna,\n\nYour Jubilee account is deleted. You are signed out everywhere, your open requests are cancelled and the businesses have been told. Your personal data is erased within 30 days.\n\nIf you didn't do this, write to help@jubilee.example at once.${end}`],
  ['statement-lapsed', 'Luzandre.com is paused until you agree to the statement of faith', `Hi Naomi,

We updated Jubilee’s statement of faith on 2 November 2026 and asked every owner to read it and agree within 30 days. We have not had your agreement, so Luzandre.com is paused: it is hidden from browse and search. Your requests and your messages stay, and nothing is deleted.

Read the statement and agree, and Luzandre.com is live again at once: ${base}/my-business${end}`],
  ['new-report', 'New report: Legacy Financial', `A member reported a listing. Look at it within one business day.\n\nListing: Legacy Financial\nReason: The listing is misleading or out of date\nWhat happened: The office address on the listing is closed; they moved last spring.\n\nOpen the report: https://admin.jubilee.to/reports/3f9c2a71-8d4e-4b6a-9c15-2e7f0b8d41a6\n\nThe reporter's name is shown to the Jubilee team in the admin application only.${end}`],
  ['access-request', 'Access request: /my-business', `A member asked for access to a page they could not open. Nothing was granted; look at it and answer them.\n\nPage: ${base}/my-business\nMember: Joanna Adeyemi (joanna@example.com)\nAsked: 3:15 p.m. Eastern on Thursday 12 November\n\nTheir roles and permissions are unchanged until the team changes them.${end}`],
  ['listing-taken-down', 'We’ve taken down Luzandre.com', `Hi Naomi,\n\nThe Jubilee team has taken Luzandre.com off Jubilee. Here is why:\n\nThe web address in the listing’s name leads to a different company’s store, so members could not tell who they were buying from.\n\nIf you have questions, reply to this e-mail. You may list your business again from ${base}/my-business.${end}`],
  ['draft-expiring', 'Your draft of Luzandre.com will be deleted in 14 days', `Hi Naomi,\n\nYou started listing Luzandre.com on Jubilee and have not touched it in six months. We will delete the draft in 14 days.\n\nContinue it any time before then: ${base}/list\n\nNothing was ever public. ${signature}\n`],
  ['new-booking-request', 'New booking request from Joanna Adeyemi', `Hi Naomi,\n\nJoanna Adeyemi would like to meet.\n\nCustom design consultation\nThu 12 Nov, 2:00 PM (30 minutes)\nVideo call\n“Shirts for our youth retreat, about 40 of them.”\nConfirm or decline it: ${base}/my-business/requests${end}`, unsubscribe],
  ['new-quote-request', 'New quote request from Joanna Adeyemi', `Hi Naomi,\n\nJoanna Adeyemi would like a quote.\n\nCustom church team tee\n40 shirts, two colours\n“Can you have them ready by 6 December?”\n\nReply to it: ${base}/my-business/requests${end}`, unsubscribe],
  ['new-order-request', 'New order request from Joanna Adeyemi', `Hi Naomi,\n\nJoanna Adeyemi would like to order.\n\nGold cross stoneware mug × 2\nShip to M4C 1A1\nItem $48.00 · shipping $9.00 · estimated total $57.00 + tax\n\nConfirm stock and arrange payment: ${base}/my-business/requests${end}`, unsubscribe],
  ['new-message', 'New message from Legacy Financial', `Hi Joanna,\n\nLegacy Financial sent you a message on Jubilee.\n\nRead and reply: ${base}/messages/7f3a${end}`, unsubscribe],
  ['meeting-reminder', 'Your meeting starts in 1 hour', `Hi Joanna,\n\nDiscovery meeting with Legacy Financial starts at 10:00 a.m.\n\nDetails: ${base}/requests/2b91${end}`, unsubscribe],
  ['back-in-stock', 'Faith heavyweight tee, charcoal is back in stock', `Hi Joanna,\n\nLuzandre.com has Faith heavyweight tee, charcoal again. You asked us to tell you.\n\nSee it here: ${base}/b/luzandre/p/faith-heavyweight-tee-charcoal\n\nJubilee doesn't take payment. Luzandre.com confirms stock and tells you how to pay.${end}`, unsubscribe],
  ['daily-summary', 'Your Jubilee summary for Wednesday 11 November', `Hi Naomi,\n\nHere is what happened on Jubilee since your last summary.\n\n• New quote request from Joanna Adeyemi\n• New message from Joanna Adeyemi\n• New order request from Samuel Park\n\nSee what happened: ${base}/notifications${end}`, unsubscribe],
  ['new-businesses', 'New on Jubilee this week', `Hi Joanna,\n\nThese businesses joined Jubilee this week in categories you’ve browsed.\n\nCornerstone Bookkeeping (Financial & insurance)\n${base}/b/cornerstone-bookkeeping\n\nHearthstone Renovations (Home & property)\n${base}/b/hearthstone-renovations\n\nBrowse businesses: ${base}/${end}`, unsubscribe, address],
  ['owner-tip', 'A tip for your Jubilee listing: show your work with photos', `Hi Naomi,\n\nA member who has never met you sees your listing first. Photos of your work, your shop or your team tell them what you do before they write to you.\n\nAdd photos to Luzandre.com and choose the one that leads.\n\nAdd photos: ${base}/my-business/listing\n\nThis is tip 1 of 4. We send one a month.${end}`, unsubscribe, address],
];

mkdirSync(out, { recursive: true });
for (const [key, subject, text, unsub, sender] of emails) {
  const html = render(subject, text, unsub, sender);
  writeFileSync(join(out, `${key}.html`), html);
  writeFileSync(join(out, `${key}.dark.html`), dark(html));
  writeFileSync(join(out, `${key}.txt`), `Subject: ${subject}\n\n${sender ? promotional(text) : text}`);
}

const card = ([key, subject]) => `
  <article class="mail">
    <h2>${encode(subject)}</h2>
    <p><a href="${key}.html">light</a> · <a href="${key}.dark.html">dark</a> · <a href="${key}.txt">plain text</a></p>
    <div class="pair">
      <iframe title="${encode(subject)}, light" src="${key}.html" loading="lazy"></iframe>
      <iframe title="${encode(subject)}, dark" src="${key}.dark.html" loading="lazy"></iframe>
    </div>
  </article>`;
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E-mails — Jubilee mocks</title>
<style>
  body { margin: 0; padding: 24px; font: 16px/1.5 system-ui, sans-serif; background: #f4f2ec; color: #0b0e14; }
  h1 { margin: 0 0 4px; } h2 { margin: 32px 0 4px; font-size: 18px; } p { margin: 0 0 12px; }
  a { color: #006644; }
  .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 624px)); gap: 16px; }
  iframe { width: 100%; height: 560px; border: 1px solid #dcdad2; border-radius: 8px; background: #fff; }
</style>
</head>
<body>
<h1>E-mails</h1>
<p>Every e-mail Jubilee sends (L2-179, ADR 0038), rendered from the layout the backend embeds, at
600 px, light and dark, with its plain-text part. Built by <code>node tools/email-mocks/build.mjs</code>;
do not edit the files here by hand. <a href="../index.html">All mocks</a></p>
${emails.map(card).join('\n')}
</body>
</html>
`,
);
console.log(`${emails.length} e-mails written to docs/mocks/emails`);
