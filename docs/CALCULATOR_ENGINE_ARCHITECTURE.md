# Calculator engine architecture

## Category and routes

Calculators are first-class registry tools in the `calculator` category. The searchable category index is `/calculator`; each working tool uses `/calculator/<tool-id>`. Nested calculator routes coexist with the original top-level dynamic tool route, so existing URLs remain unchanged. The sitemap continues to include only `browser` engines.

## Formula layer

Pure formula and validation functions live in `app/lib/tools/calculators/engine.ts`; React components do not own calculation math. The module contains calendar-safe age/date operations, duration normalization, BMI, percentages, simple and compound interest, amortizing loans, mortgage and vehicle-finance composition, Mifflin–St Jeor BMR/TDEE, and shared number/currency/date formatting.

The standard reducing-balance loan engine is reused by Loan, EMI, Mortgage, Car Loan, and Amortization. Investment reuses the compound-growth engine. Calendar calculations use date-only UTC values and real month lengths rather than fixed 30-day months or 365-day age approximations.

## Validation and formatting

Every public function rejects non-finite values and invalid ranges before returning a result. Date functions reject invalid dates and a target before a birth date. Percentage ratios reject zero divisors. Loan terms must be positive; negative amounts, impossible financed amounts, and a down payment above the home price are rejected. React catches `CalculatorError` and shows an accessible recovery message without producing `NaN` or `Infinity`.

Displayed values use `Intl.NumberFormat` and `Intl.DateTimeFormat`. Calculations retain full precision and round only for presentation. AED is the first-batch display currency; the core remains currency-neutral.

## Shared UI

`CalculatorTool` is a configuration-driven workspace rendered inside the existing `ToolShell`. It supplies reusable fields, selects, calculate/reset actions, validation, result cards, responsive amortization tables, formula/method explanations, examples, and scoped disclaimers. The first year of an amortization schedule is shown monthly; later years are summarized at year-end to avoid thousands of rows.

All calculator analytics use the existing allowlisted abstraction and contain only the calculator slug, category, generic status, and browser processing location. Entered dates, ages, body measurements, financial values, and results are never emitted.

## Adding a calculator

1. Add a pure, typed function to the calculator engine and cover known values, boundaries, invalid inputs, and rounding behavior.
2. Add a unique registry entry in the `calculator` category with useful aliases and `engine: 'planned'` while incomplete.
3. Add its field configuration, result mapping, concise method/example copy, and any required limitation or disclaimer to `CalculatorTool`.
4. Verify keyboard behavior, error recovery, 320–430px layouts, and representative desktop behavior.
5. Switch the registry engine to `browser` only after the formula, route, UI, and documentation pass. Sitemap inclusion then happens automatically.

## Disclaimer model

Financial calculators label outputs as estimates, state that rates or returns are not guaranteed, and avoid lending or investment advice. Health calculators explain that BMI is a screening metric and calorie needs are estimates, not diagnoses or treatment advice. Disclaimers stay adjacent to method and limitation content rather than hiding in legal boilerplate.

## Testing requirements

Each formula needs deterministic pure-function tests for a known result, relevant boundaries, zero-rate or zero-divisor behavior, invalid input, and reuse paths. Calendar functions additionally cover leap years, end-of-month changes, reversal, and inclusivity. Amortization tests verify the ending balance and reconciliation of principal.
