// The survey engine's sample data, ported word for word from the Magic Patterns design
// ("Jubilee Admin" and "Jubilee App", shared/admin/surveys.ts). Today, in the design, is Tuesday
// 18 November 2025. Several surveys run at once; members only ever see one, picked by priority and
// held back by the frequency cap. The mocks keep the design's own dates (2025), as the admin
// mocks do, and say so in docs/mocks/README.md.

export const TODAY_DAY = 18;
export const TODAY_LABEL = "Tue 18 Nov";

export const SURVEYS = [
  {
    id: "srv_gala25",
    slug: "christmas-gala",
    title: "Christmas Gala: what would bring you?",
    status: "live",
    audience: "All members",
    reach: 3820,
    trigger: "Home card on next visit",
    channels: ["In-app", "Email"],
    opensAt: "Mon 3 Nov, 9:00",
    expiresAt: "Fri 21 Nov, 23:59",
    startDay: 3,
    endDay: 21,
    responses: 412,
    cap: 600,
    priority: 1,
    owner: "Ada Nwosu",
    anonymous: false,
    questions: [
      {
        id: "q1",
        type: "single",
        title:
          "Are you planning to come to the Christmas Gala on Saturday 13 December?",
        required: true,
        options: ["Yes, I’ll be there", "Maybe", "Not this year"],
        logic: [{ when: "Not this year", goTo: "q4" }],
        counts: [198, 141, 73],
        answered: 412,
      },
      {
        id: "q2",
        type: "multi",
        title: "What would you most like on the night?",
        help: "Pick up to three.",
        required: true,
        options: [
          "Live worship",
          "Seller market",
          "Testimony stories",
          "Kids’ corner",
          "Food trucks",
        ],
        counts: [281, 204, 166, 97, 152],
        answered: 339,
      },
      {
        id: "q3",
        type: "scale",
        title: "How likely are you to bring a friend who isn’t on Jubilee yet?",
        required: true,
        scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Definitely" },
        counts: [6, 3, 5, 9, 11, 24, 28, 47, 71, 58, 77],
        answered: 339,
      },
      {
        id: "q4",
        type: "long",
        title: "Is there anything that would stop you from coming?",
        required: false,
        answered: 188,
        samples: [
          {
            body: "Childcare. If there was a kids’ room I’d bring the whole family.",
            who: "Grace O.",
            when: "2h ago",
          },
          {
            body: "It’s far from Brampton without a car. A carpool board on Jubilee would help.",
            who: "Daniel A.",
            when: "5h ago",
          },
          {
            body: "Ticket price. $25 is a lot in December.",
            who: "Anonymous",
            when: "Yesterday",
          },
          {
            body: "Nothing, just hope it doesn’t clash with our carol service.",
            who: "Ruth M.",
            when: "Yesterday",
          },
        ],
      },
      {
        id: "q5",
        type: "yesno",
        title: "Can we email you when tickets go on sale?",
        required: true,
        options: ["Yes", "No"],
        counts: [317, 95],
        answered: 412,
      },
    ],
  },
  {
    id: "srv_seller_q4",
    slug: "seller-experience-q4",
    title: "Seller experience, Q4",
    status: "live",
    audience: "Sellers with a live listing",
    reach: 612,
    trigger: "Home card on next visit",
    channels: ["In-app"],
    opensAt: "Mon 10 Nov, 9:00",
    expiresAt: "Fri 5 Dec, 17:00",
    startDay: 10,
    endDay: 35,
    responses: 138,
    cap: null,
    priority: 2,
    owner: "Tobi Adeyemi",
    anonymous: true,
    questions: [
      {
        id: "q1",
        type: "scale",
        title:
          "How likely are you to recommend selling on Jubilee to another business owner?",
        required: true,
        scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Definitely" },
        counts: [2, 1, 3, 4, 6, 9, 12, 21, 30, 22, 28],
        answered: 138,
      },
      {
        id: "q2",
        type: "multi",
        title: "What slowed you down this quarter?",
        required: true,
        options: [
          "Replying to requests on time",
          "Getting paid",
          "Photos and listing setup",
          "Few requests",
          "Nothing",
        ],
        counts: [41, 18, 33, 52, 29],
        answered: 138,
      },
      {
        id: "q3",
        type: "long",
        title: "One thing we should change for sellers?",
        required: false,
        answered: 64,
        samples: [
          {
            body: "Let me set hours so requests at midnight don’t count against my response time.",
            who: "Anonymous",
            when: "1h ago",
          },
          {
            body: "A way to send a quote inside the conversation instead of typing prices.",
            who: "Anonymous",
            when: "Yesterday",
          },
          { body: "More buyers from outside the GTA.", who: "Anonymous", when: "2 days ago" },
        ],
      },
    ],
  },
  {
    id: "srv_heard",
    slug: "how-did-you-hear",
    title: "How did you hear about Jubilee?",
    status: "live",
    audience: "Joined in the last 14 days",
    reach: 241,
    trigger: "Home card on next visit",
    channels: ["In-app"],
    opensAt: "Wed 1 Oct",
    expiresAt: "Wed 31 Dec, 23:59",
    startDay: -30,
    endDay: 61,
    responses: 287,
    cap: null,
    priority: 3,
    owner: "Ada Nwosu",
    anonymous: false,
    questions: [
      {
        id: "q1",
        type: "single",
        title: "How did you first hear about Jubilee?",
        required: true,
        options: [
          "Announced at church",
          "A friend or family member",
          "Instagram",
          "WhatsApp group",
          "Somewhere else",
        ],
        counts: [112, 79, 41, 38, 17],
        answered: 287,
      },
      {
        id: "q2",
        type: "short",
        title: "Which church or group?",
        required: false,
        answered: 151,
        samples: [
          { body: "Jesus House Toronto", who: "Femi K.", when: "3h ago" },
          { body: "RCCG Kingdom Life, Mississauga", who: "Esther B.", when: "Yesterday" },
          { body: "Young adults WhatsApp at Grace Chapel", who: "Kwame D.", when: "Yesterday" },
        ],
      },
    ],
  },
  {
    id: "srv_photos",
    slug: "photo-guidelines",
    title: "Are the listing photo guidelines clear?",
    status: "paused",
    audience: "Sellers who uploaded photos",
    reach: 388,
    trigger: "Home card on next visit",
    channels: ["In-app"],
    opensAt: "Wed 5 Nov, 9:00",
    expiresAt: "Sun 30 Nov, 23:59",
    startDay: 5,
    endDay: 30,
    responses: 46,
    cap: 150,
    priority: 4,
    owner: "Tobi Adeyemi",
    anonymous: false,
    note: "Paused by Tobi on 14 Nov: question 2 linked to the old guidelines page.",
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How clear were the photo guidelines?",
        required: true,
        scale: { min: 1, max: 5, minLabel: "", maxLabel: "" },
        counts: [4, 7, 12, 14, 9],
        answered: 46,
      },
      {
        id: "q2",
        type: "yesno",
        title: "Did you change a photo after reading them?",
        required: true,
        options: ["Yes", "No"],
        counts: [19, 27],
        answered: 46,
      },
    ],
  },
  {
    id: "srv_worship",
    slug: "worship-night-check-in",
    title: "Worship Night check-in",
    status: "scheduled",
    audience: "Checked in at Worship Night",
    reach: 180,
    trigger: "Email, the morning after",
    channels: ["In-app", "Email"],
    opensAt: "Sat 29 Nov, 9:00",
    expiresAt: "Tue 2 Dec, 23:59",
    startDay: 29,
    endDay: 32,
    responses: 0,
    cap: null,
    priority: 1,
    owner: "Ada Nwosu",
    anonymous: false,
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How was Worship Night?",
        required: true,
        scale: { min: 1, max: 5, minLabel: "", maxLabel: "" },
      },
      {
        id: "q2",
        type: "yesno",
        title: "Would you come to the next one?",
        required: true,
        options: ["Yes", "No"],
        logic: [{ when: "No", goTo: "q3" }],
      },
      { id: "q3", type: "long", title: "What should we do differently?", required: false },
    ],
  },
  {
    id: "srv_next",
    slug: "what-next",
    title: "What should we build next?",
    status: "draft",
    audience: "All members",
    reach: 3820,
    trigger: "Home card on next visit",
    channels: ["In-app"],
    opensAt: "Not set",
    expiresAt: "Not set",
    startDay: 0,
    endDay: 0,
    responses: 0,
    cap: null,
    priority: null,
    owner: "Ada Nwosu",
    anonymous: false,
    questions: [],
  },
  {
    id: "srv_tee",
    slug: "purpose-tee",
    title: "Purpose Tee: sizes and colours",
    status: "closed",
    audience: "Anyone with the link",
    link: true,
    reach: 0,
    trigger: "Shared by link",
    channels: ["Link", "In-app"],
    opensAt: "Mon 6 Oct",
    expiresAt: "Mon 27 Oct",
    startDay: -26,
    endDay: -5,
    responses: 904,
    cap: 900,
    priority: null,
    owner: "Ada Nwosu",
    anonymous: false,
    note: "Closed early: hit its 900 response cap.",
    questions: [
      {
        id: "q1",
        type: "single",
        title: "Which colourway would you wear most?",
        required: true,
        options: ["Black, gold Purpose", "Bone, green cross", "Gold, one ink"],
        counts: [472, 268, 164],
        answered: 904,
      },
      {
        id: "q2",
        type: "dropdown",
        title: "What size do you usually wear?",
        required: true,
        options: ["XS", "S", "M", "L", "XL", "XXL"],
        counts: [31, 148, 287, 246, 139, 53],
        answered: 904,
      },
    ],
  },
  {
    id: "srv_launch_nps",
    slug: "launch-week",
    title: "Launch week: how are we doing?",
    status: "closed",
    audience: "All members",
    reach: 2140,
    trigger: "Home card on next visit",
    channels: ["In-app"],
    opensAt: "Mon 8 Sep",
    expiresAt: "Sun 21 Sep",
    startDay: -54,
    endDay: -40,
    responses: 611,
    cap: null,
    priority: null,
    owner: "Ada Nwosu",
    anonymous: true,
    note: "Expired on schedule.",
    questions: [
      {
        id: "q1",
        type: "scale",
        title: "How likely are you to recommend Jubilee to someone at church?",
        required: true,
        scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Definitely" },
        counts: [11, 6, 9, 14, 19, 38, 44, 81, 128, 107, 154],
        answered: 611,
      },
      {
        id: "q2",
        type: "long",
        title: "What almost stopped you from signing up?",
        required: false,
        answered: 233,
        samples: [
          {
            body: "Didn’t know if it was only for Nigerian churches. It isn’t, but say that.",
            who: "Anonymous",
            when: "21 Sep",
          },
          { body: "The verification email took 20 minutes.", who: "Anonymous", when: "19 Sep" },
        ],
      },
    ],
  },
];

export const QUESTION_TYPES = [
  { type: "single", label: "One choice" },
  { type: "multi", label: "Several choices" },
  { type: "dropdown", label: "Dropdown" },
  { type: "yesno", label: "Yes or no" },
  { type: "scale", label: "0–10 scale" },
  { type: "rating", label: "Star rating" },
  { type: "short", label: "Short answer" },
  { type: "long", label: "Long answer" },
];

export const typeLabel = (t) =>
  QUESTION_TYPES.find((q) => q.type === t)?.label ?? t;

/** Days left until expiry, from today. */
export const daysLeft = (s) => s.endDay - TODAY_DAY;

export const getSurvey = (id) => SURVEYS.find((s) => s.id === id) ?? SURVEYS[0];

/** The builder's starter questions for a new survey (the design's STARTER). */
export const STARTER = [
  {
    id: "n1",
    type: "single",
    title: "Which of these would make Jubilee most useful to you?",
    required: true,
    options: [
      "Booking services, like tutors or photographers",
      "Selling secondhand items",
      "Finding church events near me",
      "Something else",
    ],
    logic: [{ when: "Something else", goTo: "n2" }],
  },
  { id: "n2", type: "short", title: "What would you add?", required: false },
  {
    id: "n3",
    type: "scale",
    title: "How likely are you to recommend Jubilee to someone at your church?",
    required: true,
    scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Definitely" },
  },
];

/** Who can be asked (the design's AudienceTab SEGMENTS). */
export const SEGMENTS = [
  { key: "all", label: "All members", hint: "Everyone with a verified account", reach: 3820 },
  {
    key: "sellers",
    label: "Sellers with a live listing",
    hint: "Businesses and makers currently listed",
    reach: 612,
  },
  { key: "buyers", label: "Members who sent a request", hint: "In the last 90 days", reach: 1470 },
  { key: "new", label: "Joined in the last 14 days", hint: "Rolls forward each day", reach: 241 },
  {
    key: "event",
    label: "Checked in at Worship Night",
    hint: "Saturday 29 November, from the door scanner",
    reach: 180,
  },
  {
    key: "link",
    label: "Anyone with the link",
    hint: "Members and guests, no account needed",
    reach: 0,
  },
  {
    key: "custom",
    label: "Custom rules",
    hint: "Combine church, city, activity and more",
    reach: 0,
  },
];

/** The latest respondents (the design's ResponsesTable PEOPLE). */
export const PEOPLE = [
  { name: "Grace Okafor", church: "Jesus House Toronto", when: "12 min ago" },
  { name: "Daniel Asante", church: "Grace Chapel, Brampton", when: "41 min ago" },
  { name: "Ruth Mensah", church: "RCCG Kingdom Life", when: "1h ago" },
  { name: "Femi Kolawole", church: "Jesus House Toronto", when: "2h ago" },
  { name: "Esther Boateng", church: "Church of Pentecost, Toronto", when: "3h ago" },
  { name: "Kwame Darko", church: "Grace Chapel, Brampton", when: "5h ago" },
  { name: "Ifeoma Eze", church: "Winners Chapel Toronto", when: "Yesterday" },
  { name: "Samuel Adjei", church: "RCCG Kingdom Life", when: "Yesterday" },
];

/** A respondent's answer to one question (the design's answerFor). */
export function answerFor(q, i) {
  if (q.samples?.length) return q.samples[i % q.samples.length].body;
  if (q.type === "short" || q.type === "long") return "—";
  if (q.scale && q.type === "scale") return String([9, 10, 7, 8, 10, 6, 9, 8][i % 8]);
  if (q.type === "rating") return `${[4, 5, 3, 4, 2, 5, 4, 3][i % 8]} of 5`;
  const opts = q.options ?? [];
  if (q.type === "multi")
    return [opts[i % opts.length], opts[(i + 2) % opts.length]].join(", ");
  return opts[[0, 1, 0, 2, 0, 1, 0, 0][i % 8] % opts.length];
}

/** The answers the participant mocks show part-way through (the design's SAMPLE). */
export const SAMPLE = {
  q1: "Yes, I’ll be there",
  q2: ["Live worship", "Seller market"],
  q3: 8,
  q4: "Childcare. If there was a kids’ room I’d bring the whole family.",
  q5: "Yes",
};
