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

## Claim-opruiming: automatische vrijgave na 1u

- [ ] Eén algemene regel: elke geclaimde taak (status 0 óf 1) komt automatisch vrij na 1u zonder
      wijziging (`modified_at`) — een periodieke serverjob zet zo'n taak op status −1, dezelfde
      actie als de bestaande handmatige "Vastzittende taken"-vrijgave. Dit lost meteen ook de
      "limbo"-taken op (claims die door een crash/herstart nooit hun normale vrijgave kregen —
      zie het voorstel op https://claude.ai/code/artifact/4d24c13d-71be-427f-8e34-d90a3d6ffb5a):
      die vallen na 1u gewoon mee onder dezelfde regel, een apart client-side vangnet is dus niet
      nodig. Enige stuk dat wél apart moet: is de gebruiker op dat moment actief aan het
      annoteren, dan moet er vooraf gewaarschuwd worden dat de claim gaat verlopen (zodat er nog
      bewaard/verlengd kan worden) i.p.v. stil vrij te geven — vereist een manier om "actief aan
      het werk" te onderscheiden van "open maar niemand kijkt" (bv. een laatste-interactie-
      timestamp vanuit de frontend, niet enkel de `modified_at` van de taak zelf). Nog niet
      ontworpen.
