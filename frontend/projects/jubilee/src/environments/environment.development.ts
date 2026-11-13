export const environment = {
  /** The admin application served by `npm run start:admin`. */
  adminUrl: 'http://localhost:4202',
  version: '1.0.0',
  /**
   * The status page "Check status" opens when Jubilee cannot be reached (L2-121 AC2). It is hosted
   * apart from the API so it survives an outage; the address is an owner step (ADR 0068).
   */
  statusUrl: 'https://status.jubilee.example',
};
