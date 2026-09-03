# Home Energy Advisor — Landing Page

Publisher-facing landing page for the embeddable savings widget.

## Deployed
- Live URL: https://neovance.github.io/home-energy-advisor/ (GitHub Pages, branch `gh-pages`, `/` root)

## Custom domain (when registered)
1. Register the domain with any registrar (Namecheap/Cloudflare — requires payment).
2. In repo Settings → Pages → Custom domain, set the domain (or add a `CNAME` file containing the domain).
3. At the registrar, add DNS records:
   - `CNAME` record: `<subdomain or www>` → `neovance.github.io`
   - Apex: `A` records → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - Or `ALIAS/ANAME` apex → `neovance.github.io`
4. Enable "Enforce HTTPS" once the certificate provisions.
5. Update the `src=` URLs in index.html's embed snippet to the final domain.

## Files
- index.html — landing page (value prop, live preview, copy-paste embed code, pricing)
- demo.html — bare widget demo page
- hea-widget.js — the widget itself (copied from the main project)
