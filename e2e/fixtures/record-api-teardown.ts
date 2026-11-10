import { mergeRecordings } from './mock-api';

/** After `npm run record-api`: the workers' answers become fixtures/api/responses.json. */
export default function recordApiTeardown(): void {
  mergeRecordings();
}
