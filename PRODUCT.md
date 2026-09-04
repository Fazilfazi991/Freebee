# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inferred from the calculator brief: general-public users who need quick, understandable browser-based utility and calculator results on desktop or mobile. The exact launch geography remains undecided.

## Product Purpose

Provide a broad catalog of focused tools that complete useful work locally in the browser, without requiring an account. Success means each published tool is genuinely functional, fast, understandable, private by default, and discoverable through the shared catalog.

## Positioning

The platform combines a reusable public-tools catalog with transparent browser-local processing. Working status, privacy boundaries, metadata, related discovery, and sitemap eligibility come from one registry rather than being claimed independently by each page.

## Operating Context

People arrive from search or the tool directory, enter or select task-specific data, receive a clearly labeled result, and may reset or move to a related tool. Calculators must work at mobile widths and must not require uploads, cloud persistence, or server-side calculations.

## Capabilities and Constraints

- Existing Remix, React, TypeScript, and Vite application with a central tool registry and reusable platform shell.
- `/builder`, invoice, and quotation functionality are outside the calculator work and must remain unchanged.
- Calculator inputs and outputs remain in browser memory and are excluded from analytics.
- Published calculator formulas are pure, validated, dependency-free where practical, and covered by tests.
- Financial, health, medical, and legal outcomes must not be overstated; calculators provide estimates or screening metrics, not professional advice.
- Production brand, domain, and legal values remain centralized placeholders.

## Brand Commitments

Preserve the incumbent public-tools visual system, concise plain-language voice, privacy-first disclosures, and centralized platform assets. No fabricated ratings, commercial claims, or evidence.

## Evidence on Hand

The repository contains the working registry, category pages, shared tool shell, browser-local engines, analytics allowlist, sitemap generation, responsive styles, tests, and implementation-status documentation. No testimonials, customer logos, ratings, or performance benchmarks are supplied and none should be invented.

## Product Principles

- Ship real utility, never simulated results.
- Keep private inputs local and analytics content-free.
- Reuse one platform architecture instead of duplicating page shells.
- Explain methods and limitations in language a non-specialist can understand.
- Make mobile and keyboard use first-class acceptance criteria.

## Accessibility & Inclusion

Calculator forms require explicit labels, visible focus, touch-friendly controls, accessible validation, readable result updates, and layouts that remain usable from 320px upward.
