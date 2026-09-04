# Investor revenue model

The investor engine uses realized lead-sale revenue rather than a fixed or guaranteed return.

- Investor principal funds lead generation for the selected industry.
- When a paid lead sale occurs while an investment is active, the configured investor revenue share is allocated across active investors in that industry in proportion to their active principal.
- At maturity, the investor's realized allocation is the settlement amount. It can be lower than the amount invested when eligible leads are not sold.
- Settled proceeds are credited to the investor wallet.
- With automatic reinvestment enabled, the realized proceeds are immediately rolled into a new cycle in the same industry when they satisfy that industry's minimum and capacity limits.
- If proceeds do not satisfy the next-cycle minimum/capacity, they remain in the wallet for the investor to use later.
- Each investment can create at most one automatic reinvestment child, preventing duplicate rollovers.

This is a technical product specification, not a legal characterization of the arrangement.
