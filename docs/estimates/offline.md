# Estimates: offline

| Design | Effort | Complete |
|---|---|---|
| browse-offline | 4 days | 100% |
| queue-messages-offline | 4 days | 100% |
| show-connection-state | 4 days | 97% |

Left: the hosted status page. "Check status" opens `environment.statusUrl`, still the placeholder
`https://status.jubilee.example` until the repository owner hosts a page apart from the API and sets
its address (an owner step, `eng/azure/README.md`; L2-121 AC2, ADR 0068).

A message with a photo is not queued, as L2-120 AC4 requires (ADR 0051); it is not left work.
