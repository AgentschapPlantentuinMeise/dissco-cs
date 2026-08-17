# TODO

Losse ideeën en vervolgpunten die niet meteen actie vereisen, maar niet verloren mogen gaan.
Vul gerust aan.

## Reviewer feedback loop

- [ ] Geen taalvoorkeur per gebruiker gekend. `CurrentUser`/`MadocUserIdentity` hebben enkel
      `id`/`name`/`siteId`/`scope` — de UI-taal zit puur lokaal in de browser (`i18nextLng`),
      dus onzichtbaar voor de server en voor andere gebruikers. Een reviewer die feedback stuurt
      heeft dus geen manier om te weten in welke taal de indiener het platform gebruikt, of om
      zelfs een verstandige fallback (bv. Engels) te kiezen. Kandidaat-oplossing: eigen tabel in
      het dissco-cs-schema (`site_id`, `user_id`, `preferred_language`), gevuld via de huidige
      i18next-taal bij een bestaande geauthenticeerde request. Zelfde euvel geldt al langer,
      onopgemerkt, voor forumberichten. Nog niet ontworpen.
