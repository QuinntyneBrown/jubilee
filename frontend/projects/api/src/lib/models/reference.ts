export type ReferenceAnswerValue = 'vouches' | 'cant-vouch' | 'doesnt-know';

export interface AnswerOption {
  value: ReferenceAnswerValue;
  label: string;
  hint: string;
}

/** `POST /api/reference-requests/open`: what the reference form shows (L2-081). */
export interface ReferenceRequestView {
  ownerName: string;
  ownerFirstName: string;
  business: string;
  church: string;
  intro: string;
  question: string;
  answers: AnswerOption[];
}

export interface ReferenceAnswerBody {
  token: string;
  answer: ReferenceAnswerValue | null;
  name: string;
  role: string;
  note: string;
}
