// The 51 tables of the admin application, in its 11 groups, as the Magic Patterns design draws
// them (shared/admin/entities/*.ts and registry.ts). Labels, descriptions, counts and sample rows
// are the design's own; change them there first, then here.
import { entity } from './schema.mjs';

const RM = 'Requests & messaging';
const MOD = 'Moderation';
const ACT = 'Member activity';
const FB = 'Feedback';

const accounts = [
  entity({
    key: 'members', label: 'Members', singular: 'Member', group: 'Accounts', count: 2418,
    description: 'Everyone with a Jubilee account: shoppers, renters and the people behind each listing.',
    fields: ['id', 'name', 'email:email', 'status:status', 'role:status', 'neighbourhood', 'church', 'listings:number', 'emailVerified:bool', 'lastSeenAt:datetime', 'createdAt:datetime', 'bio:long'],
    cols: 7,
    options: { status: ['active', 'suspended', 'banned', 'pending'], role: ['member', 'seller', 'host'] },
    rows: [
      ['mem_8F2kQa', 'Mara Okafor', 'mara@kiln.co', 'active', 'seller', 'Leslieville', 'Riverdale Fellowship', 3, true, '18 Nov 09:41', '02 Feb 2025 14:10', 'Ceramicist. Makes the Morning mug set and runs a Saturday pottery class.'],
      ['mem_3Lw9Tb', 'Daniel Mensah', 'daniel.mensah@gmail.com', 'active', 'member', 'Scarborough', 'Agape Toronto', 0, true, '18 Nov 08:02', '19 Mar 2025 18:44', ''],
      ['mem_Q7hP2c', 'Grace Lin', 'grace@flowercreations.ca', 'active', 'seller', 'North York', 'Toronto Chinese Alliance', 2, true, '17 Nov 21:15', '28 Jan 2025 10:02', 'Florist. Sunday altar arrangements for six parishes.'],
      ['mem_Vx41Rd', 'Samuel Adeyemi', 'sam.adeyemi@legacyfin.ca', 'active', 'seller', 'Etobicoke', 'Kingsway Baptist', 1, true, '17 Nov 16:30', '11 Feb 2025 09:20', 'Certified financial planner, Legacy Financial.'],
      ['mem_c9JmEe', 'Ruth Castillo', 'ruth.c@outlook.com', 'suspended', 'host', 'Roncesvalles', 'St. Casimir', 1, true, '09 Nov 12:05', '04 Apr 2025 20:31', ''],
      ['mem_2NbYuf', 'Joseph Tran', 'jtran88@yahoo.ca', 'pending', 'member', 'East York', '', 0, false, '18 Nov 07:55', '18 Nov 2025 07:51', ''],
      ['mem_Kd8sWg', 'Hannah Bergstrom', 'hannah.b@proton.me', 'active', 'host', 'East York', 'Danforth Mennonite', 1, true, '16 Nov 19:12', '22 Jun 2025 11:48', 'Looking for a third housemate near Pape.'],
    ],
  }),
  entity({
    key: 'staff', label: 'Staff', singular: 'Staff member', group: 'Accounts', count: 9,
    description: 'People who can sign in to this admin, and what they are allowed to change.',
    fields: ['id', 'name', 'email:email', 'role:status', 'status:status', 'mfaEnabled:bool', 'lastSignInAt:datetime', 'createdAt:datetime'],
    options: { role: ['owner', 'admin', 'moderator', 'support', 'read only'] },
    rows: [
      ['stf_01Ada', 'Ada Nwosu', 'ada@jubilee.to', 'owner', 'active', true, '18 Nov 09:02', '04 Jan 2025 10:00'],
      ['stf_02Ben', 'Ben Carter', 'ben@jubilee.to', 'admin', 'active', true, '18 Nov 08:47', '04 Jan 2025 10:05'],
      ['stf_03Esi', 'Esi Boateng', 'esi@jubilee.to', 'moderator', 'active', true, '18 Nov 07:30', '12 Mar 2025 13:22'],
      ['stf_04Luc', 'Lucas Pereira', 'lucas@jubilee.to', 'support', 'active', false, '15 Nov 17:10', '30 May 2025 09:15'],
      ['stf_05Mei', 'Mei Wong', 'mei@jubilee.to', 'read only', 'invited', false, '', '17 Nov 2025 15:40'],
    ],
  }),
  entity({
    key: 'sessions', label: 'Sessions', singular: 'Session', group: 'Accounts', count: 3127,
    description: 'Signed-in devices. Revoking one signs that device out on its next request.',
    fields: ['id', 'memberId:ref:members', 'device', 'ip:mono', 'location', 'status:status', 'lastActiveAt:datetime', 'expiresAt:datetime', 'createdAt:datetime'],
    options: { status: ['active', 'expired', 'revoked'] },
    rows: [
      ['ses_a81Fq', 'mem_8F2kQa', 'Safari · iPhone', '99.229.14.8', 'Toronto, ON', 'active', '18 Nov 09:41', '18 Dec 09:41', '11 Nov 08:12'],
      ['ses_b22Kw', 'mem_3Lw9Tb', 'Chrome · Windows', '142.198.77.3', 'Scarborough, ON', 'active', '18 Nov 08:02', '18 Dec 08:02', '18 Nov 08:01'],
      ['ses_c93Lp', 'mem_c9JmEe', 'Chrome · Android', '173.33.201.9', 'Toronto, ON', 'revoked', '09 Nov 12:05', '09 Dec 12:05', '02 Nov 19:44'],
      ['ses_d04Mx', 'mem_Q7hP2c', 'Firefox · macOS', '64.231.5.120', 'North York, ON', 'active', '17 Nov 21:15', '17 Dec 21:15', '14 Nov 07:03'],
      ['ses_e15Nr', 'mem_Vx41Rd', 'Safari · iPad', '24.114.80.2', 'Etobicoke, ON', 'expired', '16 Oct 11:30', '16 Nov 11:30', '16 Oct 11:29'],
    ],
  }),
  entity({
    key: 'signInFailures', label: 'Sign-in failures', singular: 'Sign-in failure', group: 'Accounts', count: 412,
    description: 'Failed sign-in attempts, kept 90 days. Five in ten minutes locks the email.',
    fields: ['id', 'email:email', 'reason:status', 'ip:mono', 'location', 'userAgent', 'occurredAt:datetime'],
    options: { reason: ['wrong password', 'unknown email', 'locked', 'expired link'] },
    rows: [
      ['sif_901', 'ruth.c@outlook.com', 'locked', '185.220.101.4', 'Frankfurt, DE', 'curl/8.4', '18 Nov 06:12'],
      ['sif_900', 'ruth.c@outlook.com', 'wrong password', '185.220.101.4', 'Frankfurt, DE', 'curl/8.4', '18 Nov 06:11'],
      ['sif_899', 'ruth.c@outlook.com', 'wrong password', '185.220.101.4', 'Frankfurt, DE', 'curl/8.4', '18 Nov 06:11'],
      ['sif_898', 'pastor.mike@church.ca', 'unknown email', '99.230.4.17', 'Toronto, ON', 'Safari · iPhone', '17 Nov 22:40'],
      ['sif_897', 'jtran88@yahoo.ca', 'expired link', '70.52.18.6', 'East York, ON', 'Chrome · Android', '18 Nov 07:49'],
    ],
  }),
  entity({
    key: 'linkTokens', label: 'Link tokens', singular: 'Link token', group: 'Accounts', count: 864,
    description: 'One-time sign-in and email-verification links. Each works once and lasts 15 minutes.',
    fields: ['id', 'email:email', 'purpose:status', 'status:status', 'tokenHash:mono', 'expiresAt:datetime', 'usedAt:datetime', 'createdAt:datetime'],
    options: { purpose: ['sign in', 'verify email', 'change email'], status: ['pending', 'used', 'expired', 'revoked'] },
    rows: [
      ['ltk_7781', 'jtran88@yahoo.ca', 'verify email', 'pending', 'sha256:9f2c…e1a0', '18 Nov 08:06', '', '18 Nov 07:51'],
      ['ltk_7780', 'mara@kiln.co', 'sign in', 'used', 'sha256:41bd…07c3', '11 Nov 08:26', '11 Nov 08:12', '11 Nov 08:11'],
      ['ltk_7779', 'jtran88@yahoo.ca', 'verify email', 'expired', 'sha256:c08e…5d9b', '17 Nov 22:05', '', '17 Nov 21:50'],
      ['ltk_7778', 'hannah.b@proton.me', 'change email', 'revoked', 'sha256:2a71…bb40', '16 Nov 19:30', '', '16 Nov 19:15'],
    ],
  }),
  entity({
    key: 'passwordResets', label: 'Password reset requests', singular: 'Password reset request', group: 'Accounts', count: 157,
    description: 'Requests to reset a password, with whether the link was used.',
    fields: ['id', 'memberId:ref:members', 'email:email', 'status:status', 'ip:mono', 'expiresAt:datetime', 'completedAt:datetime', 'createdAt:datetime'],
    options: { status: ['pending', 'completed', 'expired'] },
    rows: [
      ['pwr_311', 'mem_c9JmEe', 'ruth.c@outlook.com', 'pending', '185.220.101.4', '18 Nov 07:12', '', '18 Nov 06:12'],
      ['pwr_310', 'mem_Vx41Rd', 'sam.adeyemi@legacyfin.ca', 'completed', '24.114.80.2', '16 Nov 12:30', '16 Nov 11:34', '16 Nov 11:30'],
      ['pwr_309', 'mem_3Lw9Tb', 'daniel.mensah@gmail.com', 'expired', '142.198.77.3', '12 Nov 10:01', '', '12 Nov 09:01'],
    ],
  }),
  entity({
    key: 'securityAlerts', label: 'Security alerts', singular: 'Security alert', group: 'Accounts', count: 23,
    description: 'Things that look wrong: brute force, impossible travel, many accounts from one device.',
    fields: ['id', 'kind', 'severity:status', 'status:status', 'memberId:ref:members', 'summary:long', 'assignedTo:ref:staff', 'createdAt:datetime'],
    options: { severity: ['low', 'medium', 'high', 'critical'], status: ['open', 'investigating', 'resolved', 'dismissed'] },
    rows: [
      ['sal_023', 'Brute force', 'high', 'open', 'mem_c9JmEe', '41 failed sign-ins in 6 minutes from a Tor exit node, then a password reset request.', 'stf_03Esi', '18 Nov 06:13'],
      ['sal_022', 'Impossible travel', 'medium', 'investigating', 'mem_Vx41Rd', 'Signed in from Etobicoke and Lagos 40 minutes apart.', 'stf_02Ben', '16 Nov 11:20'],
      ['sal_021', 'Account farm', 'high', 'open', '', 'Seven new accounts from one device fingerprint in an hour, all listing "iPhone 15 for $200".', '', '15 Nov 23:02'],
      ['sal_020', 'Brute force', 'low', 'resolved', 'mem_3Lw9Tb', 'Five wrong passwords; member confirmed it was them.', 'stf_04Luc', '12 Nov 09:00'],
    ],
  }),
  entity({
    key: 'consentRecords', label: 'Consent records', singular: 'Consent record', group: 'Accounts', count: 4930,
    description: 'What each member agreed to, and when. Kept for CASL and PIPEDA, never edited, only superseded.',
    fields: ['id', 'memberId:ref:members', 'purpose:status', 'granted:bool', 'source', 'policyVersion:mono', 'ip:mono', 'createdAt:datetime'],
    options: { purpose: ['marketing email', 'analytics', 'personalised listings', 'sms'] },
    rows: [
      ['cns_4930', 'mem_2NbYuf', 'marketing email', false, 'Sign up', 'privacy-2025-09', '70.52.18.6', '18 Nov 07:51'],
      ['cns_4929', 'mem_2NbYuf', 'analytics', true, 'Cookie banner', 'privacy-2025-09', '70.52.18.6', '18 Nov 07:51'],
      ['cns_4928', 'mem_Q7hP2c', 'marketing email', true, 'Settings', 'privacy-2025-09', '64.231.5.120', '14 Nov 07:05'],
      ['cns_4927', 'mem_Kd8sWg', 'sms', false, 'Settings', 'privacy-2025-09', '99.231.8.44', '10 Nov 18:22'],
    ],
  }),
  entity({
    key: 'statementAgreements', label: 'Statement agreements', singular: 'Statement agreement', group: 'Accounts', count: 1806,
    description: 'Members who agreed to the Jubilee statement of faith and community standards.',
    fields: ['id', 'memberId:ref:members', 'statement', 'version:mono', 'status:status', 'createdAt:datetime'],
    options: { status: ['signed', 'withdrawn', 'superseded'] },
    rows: [
      ['sta_1806', 'mem_2NbYuf', 'Statement of faith', 'sof-v2', 'signed', '18 Nov 07:52'],
      ['sta_1805', 'mem_Kd8sWg', 'Community standards', 'cs-v3', 'signed', '22 Jun 2025 11:50'],
      ['sta_1804', 'mem_c9JmEe', 'Community standards', 'cs-v2', 'superseded', '04 Apr 2025 20:33'],
      ['sta_1803', 'mem_8F2kQa', 'Statement of faith', 'sof-v2', 'signed', '02 Feb 2025 14:12'],
    ],
  }),
  entity({
    key: 'dataExports', label: 'Data exports', singular: 'Data export', group: 'Accounts', count: 38,
    description: 'Member requests for a copy of their data. PIPEDA gives us 30 days.',
    fields: ['id', 'memberId:ref:members', 'status:status', 'format', 'sizeKb:number', 'downloadUrl:url', 'dueBy:date', 'createdAt:datetime'],
    options: { status: ['queued', 'processing', 'ready', 'expired', 'failed'] },
    rows: [
      ['dex_038', 'mem_Kd8sWg', 'processing', 'zip (json + photos)', null, '', '16 Dec 2025', '16 Nov 19:20'],
      ['dex_037', 'mem_3Lw9Tb', 'ready', 'zip (json)', 412, 'exports.jubilee.to/dex_037', '10 Dec 2025', '10 Nov 08:44'],
      ['dex_036', 'mem_c9JmEe', 'failed', 'zip (json + photos)', null, '', '08 Dec 2025', '08 Nov 14:02'],
    ],
  }),
];

const listings = [
  entity({
    key: 'listings', label: 'Listings', singular: 'Listing', group: 'Listings', count: 386,
    description: 'Every shop, service and space on Jubilee. Unpublishing hides it from Browse immediately.',
    fields: ['id', 'name', 'kind:status', 'status:status', 'ownerId:ref:members', 'category', 'neighbourhood', 'rating:number', 'reviewCount:number', 'slug:mono', 'tagline:long', 'publishedAt:datetime', 'createdAt:datetime'],
    cols: 7,
    options: { kind: ['Shop', 'Service', 'Space'], status: ['draft', 'in review', 'published', 'unpublished', 'removed'] },
    rows: [
      ['lst_luzandre', 'Luzandre.com', 'Shop', 'published', 'mem_8F2kQa', 'Shops', 'Leslieville', 4.9, 64, 'luzandre', 'Faith apparel and stoneware, made in Toronto.', '14 Feb 2025', '02 Feb 2025 14:20'],
      ['lst_flower', 'Flower Creations', 'Shop', 'published', 'mem_Q7hP2c', 'Shops', 'North York', 4.8, 112, 'flower-creations', 'Weddings, funerals and Sunday altars.', '30 Jan 2025', '28 Jan 2025 10:10'],
      ['lst_legacy', 'Legacy Financial', 'Service', 'published', 'mem_Vx41Rd', 'Financial & insurance', 'Etobicoke', 5.0, 41, 'legacy-financial', 'Planning that honours what you were given.', '13 Feb 2025', '11 Feb 2025 09:30'],
      ['lst_roncsuite', 'Guest suite near Roncesvalles', 'Space', 'unpublished', 'mem_c9JmEe', 'Rooms & rentals', 'Roncesvalles', 4.6, 9, 'roncesvalles-suite', 'Private suite for visiting family or a weekend away.', '10 Apr 2025', '04 Apr 2025 20:40'],
      ['lst_eastyork', 'Roommate wanted: 3-bedroom house in East York', 'Space', 'in review', 'mem_Kd8sWg', 'Rooms & rentals', 'East York', null, 0, 'east-york-roommate', 'Two housemates looking for a third, near Pape.', '', '16 Nov 19:05'],
      ['lst_waterworks', 'WaterWorks Plumbing & Drains', 'Service', 'published', 'mem_3Lw9Tb', 'Home & property', 'Scarborough', 4.7, 88, 'waterworks', 'Licensed plumbers, honest quotes.', '21 Mar 2025', '19 Mar 2025 19:00'],
    ],
  }),
  entity({
    key: 'listingDrafts', label: 'Listing drafts', singular: 'Listing draft', group: 'Listings', count: 74,
    description: 'Listings started but never submitted. Autosaved every 10 seconds while the seller types.',
    fields: ['id', 'ownerId:ref:members', 'name', 'kind:status', 'step', 'percentComplete:number', 'updatedAt:datetime', 'createdAt:datetime'],
    options: { kind: ['Shop', 'Service', 'Space'] },
    rows: [
      ['drf_074', 'mem_2NbYuf', 'Tran Family Auto Detailing', 'Service', 'Photos', 60, '18 Nov 07:58', '18 Nov 07:53'],
      ['drf_073', 'mem_8F2kQa', 'Saturday pottery class', 'Service', 'Pricing', 80, '17 Nov 20:12', '15 Nov 10:30'],
      ['drf_072', 'mem_3Lw9Tb', 'Basement apartment, Malvern', 'Space', 'Details', 25, '02 Nov 14:00', '02 Nov 13:51'],
    ],
  }),
  entity({
    key: 'listingSubmissions', label: 'Listing submissions', singular: 'Listing submission', group: 'Listings', count: 412,
    description: 'Listings sent for review. Approve publishes; reject returns it to the seller with your note.',
    fields: ['id', 'listingId:ref:listings', 'submittedBy:ref:members', 'status:status', 'reviewerId:ref:staff', 'decisionNote:long', 'submittedAt:datetime', 'decidedAt:datetime'],
    options: { status: ['submitted', 'in review', 'approved', 'rejected', 'withdrawn'] },
    rows: [
      ['sub_412', 'lst_eastyork', 'mem_Kd8sWg', 'submitted', '', '', '16 Nov 19:06', ''],
      ['sub_411', 'lst_roncsuite', 'mem_c9JmEe', 'in review', 'stf_03Esi', 'Photos show a different unit than the address. Asked host to confirm.', '15 Nov 09:40', ''],
      ['sub_410', 'lst_waterworks', 'mem_3Lw9Tb', 'approved', 'stf_03Esi', 'Licence number checked with the city.', '19 Mar 2025 19:02', '21 Mar 2025 10:14'],
      ['sub_409', 'lst_flower', 'mem_Q7hP2c', 'approved', 'stf_02Ben', '', '28 Jan 2025 10:12', '30 Jan 2025 09:01'],
    ],
  }),
  entity({
    key: 'listingSlugs', label: 'Listing slugs', singular: 'Listing slug', group: 'Listings', count: 431,
    description: 'Public URLs for listings. Old slugs redirect to the current one.',
    fields: ['id', 'slug:mono', 'listingId:ref:listings', 'isCurrent:bool', 'redirectHits:number', 'createdAt:datetime'],
    rows: [
      ['slg_431', 'east-york-roommate', 'lst_eastyork', true, 0, '16 Nov 19:05'],
      ['slg_430', 'luzandre', 'lst_luzandre', true, 0, '02 Feb 2025 14:20'],
      ['slg_429', 'luzandre-apparel', 'lst_luzandre', false, 214, '02 Feb 2025 14:20'],
      ['slg_428', 'legacy-financial', 'lst_legacy', true, 0, '11 Feb 2025 09:30'],
    ],
  }),
  entity({
    key: 'listingPhotos', label: 'Listing photos', singular: 'Listing photo', group: 'Listings', count: 2204,
    description: 'Cover and gallery photos on listings. Each is scanned for faces of children and street numbers.',
    fields: ['id', 'listingId:ref:listings', 'url:url', 'position:number', 'isCover:bool', 'scan:status', 'altText', 'createdAt:datetime'],
    options: { scan: ['passed', 'flagged', 'pending'] },
    rows: [
      ['lph_2204', 'lst_eastyork', 'cdn.jubilee.to/l/eastyork/1.jpg', 1, true, 'passed', 'Front of a brick semi on a leafy street', '16 Nov 19:04'],
      ['lph_2203', 'lst_eastyork', 'cdn.jubilee.to/l/eastyork/2.jpg', 2, false, 'flagged', 'Mail slot showing house number', '16 Nov 19:04'],
      ['lph_2202', 'lst_luzandre', 'cdn.jubilee.to/l/luzandre/7.jpg', 7, false, 'passed', 'Gold cross mug on a wooden table', '12 Nov 10:15'],
    ],
  }),
  entity({
    key: 'listingViews', label: 'Listing views', singular: 'Listing view', group: 'Listings', count: 184220,
    description: 'Page views on listings, one row per visit. Rolled up nightly into response stats.',
    fields: ['id', 'listingId:ref:listings', 'viewerId:ref:members', 'source:status', 'device', 'occurredAt:datetime'],
    options: { source: ['browse', 'search', 'direct', 'share', 'featured'] },
    rows: [
      ['lvw_184220', 'lst_flower', 'mem_3Lw9Tb', 'search', 'Chrome · Windows', '18 Nov 08:04'],
      ['lvw_184219', 'lst_legacy', '', 'share', 'Safari · iPhone', '18 Nov 08:01'],
      ['lvw_184218', 'lst_luzandre', 'mem_Kd8sWg', 'featured', 'Safari · iPhone', '18 Nov 07:59'],
      ['lvw_184217', 'lst_waterworks', '', 'browse', 'Chrome · Android', '18 Nov 07:58'],
    ],
  }),
  entity({
    key: 'products', label: 'Products', singular: 'Product', group: 'Listings', count: 1142,
    description: 'Things shops sell. Price and stock are what Browse and the listing page show.',
    fields: ['id', 'name', 'listingId:ref:listings', 'price:money', 'stock:number', 'status:status', 'sku:mono', 'description:long', 'createdAt:datetime'],
    options: { status: ['active', 'low stock', 'out of stock', 'archived'] },
    rows: [
      ['prd_tee', 'Faith heavyweight tee, charcoal', 'lst_luzandre', '$38.00', 42, 'active', 'LZ-TEE-CH', '6.5 oz cotton, screen printed in Leslieville.', '02 Feb 2025'],
      ['prd_mug', 'Gold cross stoneware mug', 'lst_luzandre', '$26.00', 3, 'low stock', 'LZ-MUG-GC', 'Wheel-thrown, 12 oz, dishwasher safe.', '02 Feb 2025'],
      ['prd_bouquet', 'Seasonal hand-tied bouquet', 'lst_flower', '$65.00', 12, 'active', 'FC-BQ-SEA', 'What is best at market this week.', '28 Jan 2025'],
      ['prd_altar', 'Sunday altar arrangement', 'lst_flower', '$140.00', 0, 'out of stock', 'FC-ALT-SUN', 'Delivered Saturday before 4 pm.', '28 Jan 2025'],
    ],
  }),
  entity({
    key: 'productPhotos', label: 'Product photos', singular: 'Product photo', group: 'Listings', count: 3016,
    description: 'Photos on products, in display order.',
    fields: ['id', 'productId:ref:products', 'url:url', 'position:number', 'altText', 'createdAt:datetime'],
    rows: [
      ['pph_3016', 'prd_mug', 'cdn.jubilee.to/p/mug/1.jpg', 1, 'Mug from the front, gold cross glaze', '02 Feb 2025'],
      ['pph_3015', 'prd_mug', 'cdn.jubilee.to/p/mug/2.jpg', 2, 'Mug handle detail', '02 Feb 2025'],
      ['pph_3014', 'prd_tee', 'cdn.jubilee.to/p/tee/1.jpg', 1, 'Charcoal tee folded', '02 Feb 2025'],
    ],
  }),
  entity({
    key: 'services', label: 'Services', singular: 'Service', group: 'Listings', count: 618,
    description: 'Bookable offerings on service listings, with how they are priced.',
    fields: ['id', 'name', 'listingId:ref:listings', 'price', 'durationMin:number', 'status:status', 'detail:long', 'createdAt:datetime'],
    options: { status: ['active', 'archived'] },
    rows: [
      ['svc_201', 'Discovery meeting', 'lst_legacy', 'Free', 45, 'active', 'A first conversation about where you are and where you want to be.', '11 Feb 2025'],
      ['svc_202', 'Retirement & RRSP review', 'lst_legacy', '$180', 90, 'active', 'A written plan you keep.', '11 Feb 2025'],
      ['svc_311', 'Drain camera inspection', 'lst_waterworks', '$149', 60, 'active', 'Video of your line, sent the same day.', '19 Mar 2025'],
    ],
  }),
  entity({
    key: 'deliveryMethods', label: 'Delivery methods', singular: 'Delivery method', group: 'Listings', count: 507,
    description: 'How a shop gets things to buyers: pickup, local delivery or shipping.',
    fields: ['id', 'listingId:ref:listings', 'method:status', 'fee:money', 'area', 'leadDays:number', 'active:bool'],
    options: { method: ['pickup', 'local delivery', 'shipping'] },
    rows: [
      ['dlv_501', 'lst_luzandre', 'pickup', '$0.00', 'Leslieville studio', 0, true],
      ['dlv_502', 'lst_luzandre', 'shipping', '$12.00', 'Canada', 4, true],
      ['dlv_503', 'lst_flower', 'local delivery', '$15.00', 'Within 15 km of North York', 1, true],
    ],
  }),
  entity({
    key: 'stockAlerts', label: 'Stock alerts', singular: 'Stock alert', group: 'Listings', count: 96,
    description: 'Members waiting for a product to come back. Sent once when stock goes above zero.',
    fields: ['id', 'productId:ref:products', 'memberId:ref:members', 'status:status', 'notifiedAt:datetime', 'createdAt:datetime'],
    options: { status: ['waiting', 'sent', 'cancelled'] },
    rows: [
      ['stk_096', 'prd_altar', 'mem_3Lw9Tb', 'waiting', '', '17 Nov 18:20'],
      ['stk_095', 'prd_altar', 'mem_Kd8sWg', 'waiting', '', '15 Nov 09:02'],
      ['stk_094', 'prd_mug', 'mem_Q7hP2c', 'sent', '10 Nov 12:00', '01 Nov 08:44'],
    ],
  }),
  entity({
    key: 'featuredSlots', label: 'Featured slots', singular: 'Featured slot', group: 'Listings', count: 52,
    description: 'Places on Browse and Home where a listing is promoted, by date range.',
    fields: ['id', 'placement:status', 'listingId:ref:listings', 'position:number', 'startsOn:date', 'endsOn:date', 'status:status', 'note:long'],
    options: { placement: ['home hero', 'browse top', 'category'], status: ['scheduled', 'live', 'ended'] },
    rows: [
      ['fts_052', 'home hero', 'lst_luzandre', 1, '17 Nov 2025', '30 Nov 2025', 'live', 'Advent gift guide'],
      ['fts_051', 'browse top', 'lst_flower', 1, '17 Nov 2025', '24 Nov 2025', 'live', ''],
      ['fts_050', 'category', 'lst_legacy', 2, '01 Dec 2025', '31 Dec 2025', 'scheduled', 'Year-end RRSP'],
    ],
  }),
  entity({
    key: 'responseTimeStats', label: 'Response time stats', singular: 'Response time stat', group: 'Listings', count: 386,
    description: 'How fast each listing answers requests, over the last 30 days. Recomputed nightly.',
    fields: ['id', 'listingId:ref:listings', 'medianMinutes:number', 'responseRate:number', 'requests30d:number', 'badge:status', 'computedAt:datetime'],
    options: { badge: ['within an hour', 'within a day', 'slow', 'none'] },
    rows: [
      ['rts_lst_flower', 'lst_flower', 22, 98, 47, 'within an hour', '18 Nov 03:00'],
      ['rts_lst_legacy', 'lst_legacy', 95, 100, 12, 'within a day', '18 Nov 03:00'],
      ['rts_lst_roncsuite', 'lst_roncsuite', 2880, 40, 5, 'slow', '18 Nov 03:00'],
    ],
  }),
];

const community = [
  entity({
    key: 'requests', label: 'Requests', singular: 'Request', group: RM, count: 1934,
    description: 'Orders, bookings and rental enquiries from members to listings.',
    fields: ['id', 'kind:status', 'listingId:ref:listings', 'memberId:ref:members', 'status:status', 'total:money', 'wantedFor:date', 'message:long', 'createdAt:datetime'],
    options: { kind: ['order', 'booking', 'rental'], status: ['requested', 'accepted', 'declined', 'completed', 'cancelled'] },
    rows: [
      ['req_1934', 'order', 'lst_flower', 'mem_3Lw9Tb', 'requested', '$140.00', '23 Nov 2025', 'Altar flowers for our anniversary service, white and gold if possible.', '18 Nov 08:05'],
      ['req_1933', 'booking', 'lst_legacy', 'mem_Kd8sWg', 'accepted', '$0.00', '20 Nov 2025', 'First-time saver, would love a discovery call.', '17 Nov 19:40'],
      ['req_1932', 'rental', 'lst_roncsuite', 'mem_Q7hP2c', 'declined', '$480.00', '05 Dec 2025', 'My parents visiting for Christmas, 4 nights.', '15 Nov 13:12'],
      ['req_1931', 'order', 'lst_luzandre', 'mem_Vx41Rd', 'completed', '$64.00', '', 'Two mugs, gift wrapped please.', '10 Nov 09:30'],
    ],
  }),
  entity({
    key: 'requestTransitions', label: 'Request transitions', singular: 'Request transition', group: RM, count: 5210,
    description: 'Each status change on a request, who made it and why.',
    fields: ['id', 'requestId:ref:requests', 'from:status', 'to:status', 'actorId:ref:members', 'reason', 'occurredAt:datetime'],
    rows: [
      ['rtr_5210', 'req_1933', 'requested', 'accepted', 'mem_Vx41Rd', '', '17 Nov 20:02'],
      ['rtr_5209', 'req_1932', 'requested', 'declined', 'mem_c9JmEe', 'Already booked those dates', '15 Nov 18:44'],
      ['rtr_5208', 'req_1931', 'accepted', 'completed', 'mem_8F2kQa', '', '12 Nov 15:00'],
    ],
  }),
  entity({
    key: 'conversations', label: 'Conversations', singular: 'Conversation', group: RM, count: 1702,
    description: 'Message threads between a member and a listing, opened by a request or a question.',
    fields: ['id', 'listingId:ref:listings', 'memberId:ref:members', 'requestId:ref:requests', 'status:status', 'messageCount:number', 'lastMessageAt:datetime', 'createdAt:datetime'],
    options: { status: ['open', 'archived', 'blocked'] },
    rows: [
      ['cnv_1702', 'lst_flower', 'mem_3Lw9Tb', 'req_1934', 'open', 2, '18 Nov 08:20', '18 Nov 08:05'],
      ['cnv_1701', 'lst_legacy', 'mem_Kd8sWg', 'req_1933', 'open', 5, '17 Nov 21:10', '17 Nov 19:40'],
      ['cnv_1700', 'lst_roncsuite', 'mem_Q7hP2c', 'req_1932', 'blocked', 9, '15 Nov 18:50', '15 Nov 13:12'],
    ],
  }),
  entity({
    key: 'messages', label: 'Messages', singular: 'Message', group: RM, count: 14388,
    description: 'Individual messages. Open only with a reason: staff reads are written to the audit log.',
    fields: ['id', 'conversationId:ref:conversations', 'senderId:ref:members', 'body:long', 'status:status', 'readAt:datetime', 'createdAt:datetime'],
    options: { status: ['sent', 'read', 'removed'] },
    rows: [
      ['msg_14388', 'cnv_1702', 'mem_Q7hP2c', 'White roses and gold ribbon, yes. Would Saturday 3 pm work?', 'sent', '', '18 Nov 08:20'],
      ['msg_14387', 'cnv_1702', 'mem_3Lw9Tb', 'Altar flowers for our anniversary service, white and gold if possible.', 'read', '18 Nov 08:15', '18 Nov 08:05'],
      ['msg_14386', 'cnv_1700', 'mem_c9JmEe', 'Pay me by e-transfer outside the app and I can hold it.', 'removed', '15 Nov 18:49', '15 Nov 18:46'],
    ],
  }),
  entity({
    key: 'messageAttachments', label: 'Message attachments', singular: 'Message attachment', group: RM, count: 2066,
    description: 'Files sent in messages. Scanned for malware before the recipient can open them.',
    fields: ['id', 'messageId:ref:messages', 'fileName', 'mimeType:mono', 'sizeKb:number', 'scan:status', 'createdAt:datetime'],
    options: { scan: ['passed', 'flagged', 'pending'] },
    rows: [
      ['att_2066', 'msg_14388', 'altar-sketch.jpg', 'image/jpeg', 812, 'passed', '18 Nov 08:20'],
      ['att_2065', 'msg_14386', 'invoice.pdf.exe', 'application/x-msdownload', 44, 'flagged', '15 Nov 18:46'],
    ],
  }),
  entity({
    key: 'reviews', label: 'Reviews', singular: 'Review', group: 'Reviews', count: 2871,
    description: 'Star ratings and written reviews on listings. Hiding one removes it from the rating too.',
    fields: ['id', 'listingId:ref:listings', 'authorId:ref:members', 'rating:number', 'status:status', 'item', 'body:long', 'ownerReply:long', 'createdAt:datetime'],
    options: { status: ['published', 'hidden', 'removed', 'pending'] },
    rows: [
      ['rev_2871', 'lst_luzandre', 'mem_Vx41Rd', 5, 'published', 'Gold cross stoneware mug', 'Heavier than it looks, glaze is beautiful. Gave one to our pastor.', 'Thank you Samuel!', '13 Nov 10:02'],
      ['rev_2870', 'lst_roncsuite', 'mem_Q7hP2c', 1, 'pending', 'Guest suite', 'Host asked for payment outside Jubilee. Do not book.', '', '15 Nov 19:00'],
      ['rev_2869', 'lst_flower', 'mem_Kd8sWg', 5, 'published', 'Seasonal hand-tied bouquet', 'Grace remembered my mother’s favourite flowers from a year ago.', '', '09 Nov 16:30'],
      ['rev_2868', 'lst_waterworks', 'mem_2NbYuf', 2, 'hidden', 'Drain camera inspection', 'Contains phone number of technician.', '', '06 Nov 11:12'],
    ],
  }),
  entity({
    key: 'listingReports', label: 'Listing reports', singular: 'Listing report', group: MOD, count: 141,
    description: 'Listings that members have reported. One report groups every entry about the same listing.',
    fields: ['id', 'listingId:ref:listings', 'reason:status', 'status:status', 'entryCount:number', 'assignedTo:ref:staff', 'firstReportedAt:datetime', 'updatedAt:datetime'],
    options: { reason: ['scam', 'misleading', 'prohibited item', 'offensive', 'duplicate'], status: ['open', 'in review', 'resolved', 'dismissed'] },
    rows: [
      ['lrp_141', 'lst_roncsuite', 'scam', 'open', 4, 'stf_03Esi', '15 Nov 18:52', '18 Nov 06:30'],
      ['lrp_140', 'lst_eastyork', 'misleading', 'open', 1, '', '17 Nov 10:11', '17 Nov 10:11'],
      ['lrp_139', 'lst_waterworks', 'duplicate', 'dismissed', 1, 'stf_02Ben', '03 Nov 09:00', '04 Nov 12:20'],
    ],
  }),
  entity({
    key: 'listingReportEntries', label: 'Listing report entries', singular: 'Listing report entry', group: MOD, count: 233,
    description: 'Each member’s individual report, with their words.',
    fields: ['id', 'reportId:ref:listingReports', 'reporterId:ref:members', 'reason:status', 'details:long', 'createdAt:datetime'],
    rows: [
      ['lre_233', 'lrp_141', 'mem_Q7hP2c', 'scam', 'Asked me to e-transfer a deposit outside the app.', '15 Nov 18:52'],
      ['lre_232', 'lrp_141', 'mem_3Lw9Tb', 'scam', 'Same thing happened to me, she said the app fee is too high.', '16 Nov 09:14'],
      ['lre_231', 'lrp_140', 'mem_8F2kQa', 'misleading', 'Photo 2 shows a house number on the mail slot.', '17 Nov 10:11'],
    ],
  }),
  entity({
    key: 'reviewReports', label: 'Review reports', singular: 'Review report', group: MOD, count: 64,
    description: 'Reviews flagged by sellers or members as unfair, abusive or fake.',
    fields: ['id', 'reviewId:ref:reviews', 'reporterId:ref:members', 'reason:status', 'status:status', 'details:long', 'createdAt:datetime'],
    options: { status: ['open', 'in review', 'resolved', 'dismissed'] },
    rows: [
      ['rrp_064', 'rev_2870', 'mem_c9JmEe', 'fake', 'open', 'This person never stayed here.', '16 Nov 08:00'],
      ['rrp_063', 'rev_2868', 'mem_3Lw9Tb', 'personal info', 'resolved', 'Has my employee’s cell number.', '06 Nov 12:00'],
    ],
  }),
  entity({
    key: 'conversationReports', label: 'Conversation reports', singular: 'Conversation report', group: MOD, count: 37,
    description: 'Members reporting a message thread for harassment, spam or off-platform payment.',
    fields: ['id', 'conversationId:ref:conversations', 'reporterId:ref:members', 'reason:status', 'status:status', 'details:long', 'createdAt:datetime'],
    options: { status: ['open', 'in review', 'resolved', 'dismissed'] },
    rows: [
      ['crp_037', 'cnv_1700', 'mem_Q7hP2c', 'off-platform payment', 'in review', 'Host wants e-transfer to hold the dates.', '15 Nov 18:51'],
      ['crp_036', 'cnv_1701', 'mem_Kd8sWg', 'spam', 'dismissed', 'Reported by mistake.', '17 Nov 21:12'],
    ],
  }),
  entity({
    key: 'reportActions', label: 'Report actions', singular: 'Report action', group: MOD, count: 198,
    description: 'What moderators did about a report, and the note left for the member.',
    fields: ['id', 'reportId:mono', 'action:status', 'staffId:ref:staff', 'note:long', 'notifiedMember:bool', 'createdAt:datetime'],
    options: { action: ['warned', 'unpublished', 'removed', 'suspended', 'dismissed'] },
    rows: [
      ['rac_198', 'lrp_141', 'unpublished', 'stf_03Esi', 'Unpublished pending host response. Two reports of off-platform payment.', true, '18 Nov 06:30'],
      ['rac_197', 'crp_037', 'suspended', 'stf_03Esi', 'Account suspended 14 days.', true, '18 Nov 06:32'],
      ['rac_196', 'rrp_063', 'removed', 'stf_02Ben', 'Hid review, phone number visible.', false, '06 Nov 12:30'],
    ],
  }),
  entity({
    key: 'savedItems', label: 'Saved items', singular: 'Saved item', group: ACT, count: 8920,
    description: 'Listings and products members have saved for later.',
    fields: ['id', 'memberId:ref:members', 'kind:status', 'targetId:mono', 'targetName', 'createdAt:datetime'],
    options: { kind: ['listing', 'product'] },
    rows: [
      ['sav_8920', 'mem_3Lw9Tb', 'listing', 'lst_flower', 'Flower Creations', '18 Nov 08:04'],
      ['sav_8919', 'mem_Kd8sWg', 'product', 'prd_mug', 'Gold cross stoneware mug', '17 Nov 20:40'],
      ['sav_8918', 'mem_Q7hP2c', 'listing', 'lst_legacy', 'Legacy Financial', '17 Nov 18:02'],
    ],
  }),
  entity({
    key: 'recentSearches', label: 'Recent searches', singular: 'Recent search', group: ACT, count: 21530,
    description: 'What members typed into search, kept 30 days to power suggestions.',
    fields: ['id', 'memberId:ref:members', 'query', 'filters:mono', 'resultCount:number', 'createdAt:datetime'],
    rows: [
      ['srh_21530', 'mem_3Lw9Tb', 'altar flowers', 'category=Shops', 6, '18 Nov 08:03'],
      ['srh_21529', 'mem_2NbYuf', 'auto detailing', '', 0, '18 Nov 07:56'],
      ['srh_21528', 'mem_Kd8sWg', 'financial planner', 'near=East York', 4, '17 Nov 19:31'],
    ],
  }),
  entity({
    key: 'notifications', label: 'Notifications', singular: 'Notification', group: ACT, count: 30412,
    description: 'In-app, email and push notifications sent to members.',
    fields: ['id', 'memberId:ref:members', 'channel:status', 'kind', 'status:status', 'title', 'readAt:datetime', 'createdAt:datetime'],
    options: { channel: ['in app', 'email', 'push'], status: ['queued', 'sent', 'read', 'failed'] },
    rows: [
      ['ntf_30412', 'mem_Q7hP2c', 'push', 'request.new', 'sent', 'New order from Daniel', '', '18 Nov 08:05'],
      ['ntf_30411', 'mem_Kd8sWg', 'email', 'request.accepted', 'read', 'Samuel accepted your booking', '17 Nov 20:30', '17 Nov 20:02'],
      ['ntf_30410', 'mem_c9JmEe', 'email', 'account.suspended', 'failed', 'Your account is suspended', '', '18 Nov 06:32'],
    ],
  }),
  entity({
    key: 'feedback', label: 'Feedback', singular: 'Feedback', group: FB, count: 289,
    description: 'Ratings, bug reports and kudos sent from the app’s feedback button.',
    fields: ['id', 'kind:status', 'memberId:ref:members', 'rating:number', 'status:status', 'page:mono', 'body:long', 'createdAt:datetime'],
    options: { kind: ['rate', 'bug', 'kudos'], status: ['new', 'triaged', 'done', 'dismissed'] },
    rows: [
      ['fbk_289', 'bug', 'mem_2NbYuf', null, 'new', '/sell/photos', 'Upload spinner never stops on Android when I add a 4th photo.', '18 Nov 07:59'],
      ['fbk_288', 'kudos', 'mem_Kd8sWg', null, 'new', '/listing/legacy-financial', 'Booked a call in two taps. Love that it shows his church.', '17 Nov 20:05'],
      ['fbk_287', 'rate', 'mem_3Lw9Tb', 4, 'triaged', '/browse', 'Would like to filter by Sunday-open.', '17 Nov 12:40'],
    ],
  }),
  entity({
    key: 'feedbackScreenshots', label: 'Feedback screenshots', singular: 'Feedback screenshot', group: FB, count: 97,
    description: 'Screenshots attached to feedback, with the page they were taken on.',
    fields: ['id', 'feedbackId:ref:feedback', 'url:url', 'width:number', 'height:number', 'createdAt:datetime'],
    rows: [
      ['fbs_097', 'fbk_289', 'cdn.jubilee.to/fb/289.png', 1080, 2340, '18 Nov 07:59'],
      ['fbs_096', 'fbk_285', 'cdn.jubilee.to/fb/285.png', 1440, 900, '16 Nov 14:22'],
    ],
  }),
];

const operations = [
  entity({
    key: 'merchProducts', label: 'Merch products', singular: 'Merch product', group: 'Merch', count: 6,
    description: 'Jubilee’s own merch: tees, mugs and stickers sold on the marketing site.',
    fields: ['id', 'name', 'status:status', 'basePrice:money', 'variantCount:number', 'description:long', 'createdAt:datetime'],
    options: { status: ['active', 'draft', 'archived'] },
    rows: [
      ['mch_tee', 'Purpose Tee', 'active', '$35.00', 12, 'Heavyweight tee with the gold Jubilee cross.', '20 Sep 2025'],
      ['mch_sticker', 'Sticker pack', 'active', '$8.00', 1, 'Six die-cut stickers.', '20 Sep 2025'],
      ['mch_mug', 'Gala mug', 'draft', '$22.00', 2, 'Christmas Gala 2025 limited run.', '10 Nov 2025'],
    ],
  }),
  entity({
    key: 'merchVariants', label: 'Merch variants', singular: 'Merch variant', group: 'Merch', count: 21,
    description: 'Size and colourway combinations, each with its own stock.',
    fields: ['id', 'productId:ref:merchProducts', 'colourway', 'size', 'sku:mono', 'stock:number', 'status:status', 'price:money'],
    options: { status: ['in stock', 'low stock', 'out of stock'] },
    rows: [
      ['mvr_tee_blk_m', 'mch_tee', 'Black, gold purpose', 'M', 'JB-TEE-BLK-M', 48, 'in stock', '$35.00'],
      ['mvr_tee_blk_l', 'mch_tee', 'Black, gold purpose', 'L', 'JB-TEE-BLK-L', 4, 'low stock', '$35.00'],
      ['mvr_tee_bone_s', 'mch_tee', 'Bone, green cross', 'S', 'JB-TEE-BON-S', 0, 'out of stock', '$35.00'],
      ['mvr_stk', 'mch_sticker', 'Mixed', 'One size', 'JB-STK-6', 310, 'in stock', '$8.00'],
    ],
  }),
  entity({
    key: 'merchOrders', label: 'Merch orders', singular: 'Merch order', group: 'Merch', count: 214,
    description: 'Orders from the merch store, paid through Stripe.',
    fields: ['id', 'customerEmail:email', 'status:status', 'total:money', 'lineCount:number', 'shipTo', 'trackingNumber:mono', 'createdAt:datetime'],
    options: { status: ['paid', 'fulfilled', 'shipped', 'delivered', 'refunded', 'cancelled'] },
    rows: [
      ['mor_214', 'mara@kiln.co', 'paid', '$78.00', 2, 'Toronto, ON M4M 2S1', '', '18 Nov 09:10'],
      ['mor_213', 'pastor.mike@church.ca', 'shipped', '$420.00', 12, 'Mississauga, ON L5B 3C2', 'CP 7023 1180 4421', '15 Nov 14:22'],
      ['mor_212', 'daniel.mensah@gmail.com', 'delivered', '$43.00', 2, 'Scarborough, ON M1B 5K7', 'CP 7023 1180 3302', '08 Nov 10:05'],
      ['mor_211', 'grace@flowercreations.ca', 'refunded', '$35.00', 1, 'North York, ON M2N 6L7', '', '02 Nov 17:40'],
    ],
  }),
  entity({
    key: 'merchOrderLines', label: 'Merch order lines', singular: 'Merch order line', group: 'Merch', count: 503,
    description: 'Each variant and quantity on a merch order.',
    fields: ['id', 'orderId:ref:merchOrders', 'variantId:ref:merchVariants', 'quantity:number', 'unitPrice:money', 'lineTotal:money'],
    rows: [
      ['mol_503', 'mor_214', 'mvr_tee_blk_m', 2, '$35.00', '$70.00'],
      ['mol_502', 'mor_214', 'mvr_stk', 1, '$8.00', '$8.00'],
      ['mol_501', 'mor_213', 'mvr_tee_blk_l', 12, '$35.00', '$420.00'],
    ],
  }),
  entity({
    key: 'launchSubscribers', label: 'Launch subscribers', singular: 'Launch subscriber', group: 'Launch', count: 3184,
    description: 'Emails collected before launch who want to hear when Jubilee opens in their area.',
    fields: ['id', 'email:email', 'neighbourhood', 'source:status', 'status:status', 'confirmedAt:datetime', 'createdAt:datetime'],
    options: { source: ['home', 'gala', 'instagram', 'referral'], status: ['pending', 'confirmed', 'unsubscribed'] },
    rows: [
      ['lsb_3184', 'abena.k@gmail.com', 'Malvern', 'gala', 'confirmed', '17 Nov 22:15', '17 Nov 22:14'],
      ['lsb_3183', 'tobi.f@icloud.com', 'Brampton', 'instagram', 'pending', '', '17 Nov 21:02'],
      ['lsb_3182', 'k.osei@rogers.com', 'Scarborough', 'referral', 'unsubscribed', '02 Oct 09:12', '02 Oct 09:10'],
    ],
  }),
  entity({
    key: 'businessPreRegistrations', label: 'Business pre-registrations', singular: 'Business pre-registration', group: 'Launch', count: 268,
    description: 'Businesses who signed up to list before launch, waiting for an invite.',
    fields: ['id', 'businessName', 'contactName', 'email:email', 'kind:status', 'category', 'status:status', 'createdAt:datetime'],
    options: { kind: ['Shop', 'Service', 'Space'], status: ['new', 'contacted', 'invited', 'listed', 'declined'] },
    rows: [
      ['bpr_268', 'Desloges Law Group', 'Marc Desloges', 'marc@deslogeslaw.ca', 'Service', 'Legal & immigration', 'new', '17 Nov 15:40'],
      ['bpr_267', 'Christian Bookstores', 'Helen Wu', 'helen@christianbooks.ca', 'Shop', 'Shops', 'invited', '12 Nov 11:00'],
      ['bpr_266', 'Deeks Insurance', 'Tom Deeks', 'tom@deeks.ca', 'Service', 'Financial & insurance', 'listed', '20 Oct 09:30'],
    ],
  }),
  entity({
    key: 'accessRequests', label: 'Access requests', singular: 'Access request', group: 'Launch', count: 91,
    description: 'People asking to join during invite-only beta. Approving sends a sign-up link.',
    fields: ['id', 'name', 'email:email', 'church', 'referredBy:ref:members', 'status:status', 'reason:long', 'createdAt:datetime'],
    options: { status: ['pending', 'approved', 'declined', 'waitlisted'] },
    rows: [
      ['acr_091', 'Priya Raman', 'priya.r@gmail.com', 'Bloor Street United', 'mem_Kd8sWg', 'pending', 'Hannah told me about the roommate listing.', '18 Nov 08:30'],
      ['acr_090', 'Kwame Asante', 'kwame@asante.ca', 'Agape Toronto', 'mem_3Lw9Tb', 'pending', 'Want to list our catering for church events.', '17 Nov 23:12'],
      ['acr_089', 'Leo Ferreira', 'leo.f@hotmail.com', '', '', 'waitlisted', 'Saw the flyer at the gala.', '16 Nov 10:20'],
    ],
  }),
  entity({
    key: 'contentVersions', label: 'Content versions', singular: 'Content version', group: 'Site & content', count: 142,
    description: 'Published copy for site pages and emails. Restoring a version publishes it again.',
    fields: ['id', 'page:mono', 'version:number', 'status:status', 'authorId:ref:staff', 'summary', 'body:json', 'publishedAt:datetime'],
    options: { status: ['draft', 'published', 'superseded'] },
    rows: [
      ['cvr_142', 'home.hero', 12, 'draft', 'stf_02Ben', 'Advent headline', '{ "title": "Gifts from people you pray with" }', ''],
      ['cvr_141', 'home.hero', 11, 'published', 'stf_01Ada', 'November refresh', '{ "title": "Support the businesses in your pews" }', '01 Nov 09:00'],
      ['cvr_140', 'email.welcome', 4, 'published', 'stf_04Luc', 'Shorter welcome', '{ "subject": "Welcome to Jubilee" }', '20 Oct 14:10'],
    ],
  }),
  entity({
    key: 'maintenanceWindows', label: 'Maintenance windows', singular: 'Maintenance window', group: 'Site & content', count: 7,
    description: 'Planned downtime. Members see a banner 24 hours before it starts.',
    fields: ['id', 'title', 'status:status', 'startsAt:datetime', 'endsAt:datetime', 'readOnlyMode:bool', 'bannerText:long', 'createdBy:ref:staff'],
    options: { status: ['scheduled', 'live', 'completed', 'cancelled'] },
    rows: [
      ['mnt_007', 'Database upgrade', 'scheduled', '23 Nov 02:00', '23 Nov 03:30', true, 'Jubilee is read-only Sunday 2–3:30 am while we upgrade.', 'stf_02Ben'],
      ['mnt_006', 'Payments migration', 'completed', '02 Nov 01:00', '02 Nov 02:10', false, '', 'stf_01Ada'],
    ],
  }),
  entity({
    key: 'auditRecords', label: 'Audit records', singular: 'Audit record', group: 'System', count: 48113, readOnly: true,
    description: 'Every change made in this admin and every staff read of private data. Cannot be edited.',
    fields: ['id', 'actorId:ref:staff', 'action:mono', 'entity', 'recordId:mono', 'ip:mono', 'diff:json', 'occurredAt:datetime'],
    rows: [
      ['aud_48113', 'stf_03Esi', 'members.update', 'Members', 'mem_c9JmEe', '10.0.4.18', '{ "status": ["active", "suspended"] }', '18 Nov 06:32'],
      ['aud_48112', 'stf_03Esi', 'listings.update', 'Listings', 'lst_roncsuite', '10.0.4.18', '{ "status": ["published", "unpublished"] }', '18 Nov 06:30'],
      ['aud_48111', 'stf_03Esi', 'messages.read', 'Messages', 'msg_14386', '10.0.4.18', '{ "reason": "crp_037" }', '18 Nov 06:21'],
      ['aud_48110', 'stf_02Ben', 'featuredSlots.create', 'Featured slots', 'fts_052', '10.0.4.22', '{ "listingId": "lst_luzandre" }', '17 Nov 09:00'],
    ],
  }),
  entity({
    key: 'outboxMessages', label: 'Outbox messages', singular: 'Outbox message', group: 'System', count: 1290, readOnly: true,
    description: 'Events waiting to be delivered to email, push and webhooks. Retried with backoff.',
    fields: ['id', 'topic:mono', 'status:status', 'attempts:number', 'lastError:long', 'payload:json', 'nextAttemptAt:datetime', 'createdAt:datetime'],
    options: { status: ['queued', 'sent', 'retrying', 'dead'] },
    rows: [
      ['obx_1290', 'email.account_suspended', 'retrying', 3, 'SMTP 421: try again later', '{ "to": "ruth.c@outlook.com" }', '18 Nov 09:52', '18 Nov 06:32'],
      ['obx_1289', 'push.request_new', 'sent', 1, '', '{ "member": "mem_Q7hP2c" }', '', '18 Nov 08:05'],
      ['obx_1288', 'webhook.stripe_refund', 'dead', 8, '404 from merch fulfilment endpoint', '{ "order": "mor_211" }', '', '02 Nov 17:41'],
    ],
  }),
  entity({
    key: 'jobRuns', label: 'Job runs', singular: 'Job run', group: 'System', count: 9874, readOnly: true,
    description: 'Scheduled and background jobs: what ran, how long it took, and whether it failed.',
    fields: ['id', 'job:mono', 'status:status', 'durationMs:number', 'itemsProcessed:number', 'error:long', 'startedAt:datetime'],
    options: { status: ['running', 'succeeded', 'failed'] },
    rows: [
      ['job_9874', 'exports.build', 'running', null, 0, '', '18 Nov 09:30'],
      ['job_9873', 'stats.response_time', 'succeeded', 41200, 386, '', '18 Nov 03:00'],
      ['job_9872', 'exports.build', 'failed', 8800, 0, 'Azure Blob 403 AuthorizationPermissionMismatch on container jubilee-exports', '18 Nov 02:00'],
      ['job_9871', 'sessions.expire', 'succeeded', 1300, 211, '', '18 Nov 01:00'],
    ],
  }),
];

export const ENTITIES = [...accounts, ...listings, ...community, ...operations];

export const GROUPS = [
  'Accounts',
  'Listings',
  'Requests & messaging',
  'Reviews',
  'Moderation',
  'Member activity',
  'Feedback',
  'Merch',
  'Launch',
  'Site & content',
  'System',
];

export const getEntity = (key) => ENTITIES.find((e) => e.key === key) ?? ENTITIES[0];
export const entitiesIn = (group) => ENTITIES.filter((e) => e.group === group);

/** A human name for a row: its name, title or email, falling back to its id. */
export function rowName(row) {
  return String(row.name ?? row.title ?? row.businessName ?? row.email ?? row.customerEmail ?? row.query ?? row.id);
}

/** Resolve a reference id to the row it points at, if the sample data has it. */
export function lookup(entityKey, id) {
  if (!entityKey || !id) return null;
  const e = ENTITIES.find((x) => x.key === entityKey);
  const index = e ? e.rows.findIndex((r) => r.id === id) : -1;
  if (!e || index < 0) return null;
  return { entity: e, row: e.rows[index], index };
}

/** Rows elsewhere that point at this record, grouped by table. */
export function backlinks(entityKey, id) {
  const out = [];
  for (const e of ENTITIES) {
    for (const f of e.fields) {
      if (f.type === 'ref' && f.ref === entityKey) {
        const count = e.rows.filter((r) => r[f.key] === id).length;
        if (count) out.push({ entity: e, field: f.label, count });
      }
    }
  }
  return out;
}
