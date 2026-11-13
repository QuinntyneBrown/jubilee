/** Production values; `environment.development.ts` replaces this file in development builds. */
export const environment = {
  /** The address of the admin application (L2-194 AC2). */
  adminUrl: 'https://admin.jubilee.to',
  /** The version of the app, which a bug report carries (L2-214). */
  version: '1.0.0',
  /**
   * The status page "Check status" opens when Jubilee cannot be reached (L2-121 AC2). It is hosted
   * apart from the API so it survives an outage; the address is an owner step (ADR 0068).
   */
  statusUrl: 'https://status.jubilee.example',
};
